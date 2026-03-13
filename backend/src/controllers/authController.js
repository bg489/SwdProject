import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import {
  UserAccount,
  Role,
  Permission,
  SessionToken,
  OtpVerification,
} from "../models/index.js";
import { buildAuthClaims } from "../utils/authClaims.js";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  getClientIp,
  getRefreshExpiryDate,
  hashToken,
} from "../utils/tokenUtils.js";
import {
  generateOtpCode,
  hashOtpCode,
  getOtpExpiryDate,
  canResendOtp,
  maskEmail,
  maskPhone,
  sendOtpOutOfBand,
} from "../utils/otpUtils.js";

const loadUserWithRoleAndPermissions = async (whereClause) => {
  return UserAccount.findOne({
    where: whereClause,
    include: [
      {
        model: Role,
        attributes: ["role_id", "role_name"],
        include: [
          {
            model: Permission,
            attributes: ["permission_id", "permission_code", "permission_name"],
            through: { attributes: [] },
          },
        ],
      },
    ],
    attributes: [
      "user_id",
      "role_id",
      "email",
      "phone",
      "password_hash",
      "account_status",
      "otp_enabled",
      "last_login_at",
      "created_at",
      "updated_at",
    ],
  });
};

const issueLoginSession = async (req, user) => {
  const claims = buildAuthClaims(user);
  const refreshToken = generateOpaqueRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const now = new Date();

  const session = await SessionToken.create({
    user_id: user.user_id,
    token_hash: refreshTokenHash,
    issued_at: now,
    expires_at: getRefreshExpiryDate(),
    revoked_at: null,
    device_info: req.headers["user-agent"] || null,
    ip_address: getClientIp(req),
  });

  const accessToken = createAccessToken({
    user,
    claims,
    sessionId: session.session_id,
  });

  await user.update({
    last_login_at: now,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    claims,
    session: {
      session_id: session.session_id,
      issued_at: session.issued_at,
      expires_at: session.expires_at,
    },
    user: {
      user_id: user.user_id,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role_name: user.Role.role_name,
      account_status: user.account_status,
      otp_enabled: user.otp_enabled,
      last_login_at: now,
    },
  };
};

const expireOldPendingOtps = async (userId, channel, replacementStatus = "REPLACED") => {
  const now = new Date();

  await OtpVerification.update(
    {
      status: replacementStatus,
    },
    {
      where: {
        user_id: userId,
        channel,
        consumed_at: null,
        status: "PENDING",
      },
    }
  );

  await OtpVerification.update(
    {
      status: "EXPIRED",
    },
    {
      where: {
        user_id: userId,
        channel,
        consumed_at: null,
        status: "PENDING",
        expires_at: {
          [Op.lt]: now,
        },
      },
    }
  );
};

const createAndSendOtp = async (user, channel) => {
  const destination = channel === "email" ? user.email : user.phone;
  const otpCode = generateOtpCode();
  const otpHash = hashOtpCode(otpCode);
  const expiresAt = getOtpExpiryDate();
  const createdAt = new Date();

  const otpRecord = await OtpVerification.create({
    user_id: user.user_id,
    channel,
    code_hash: otpHash,
    expires_at: expiresAt,
    consumed_at: null,
    status: "PENDING",
    created_at: createdAt,
  });

  const sendResult = await sendOtpOutOfBand({
    channel,
    destination,
    code: otpCode,
  });

  return {
    otpRecord,
    sendResult,
    masked_destination:
      channel === "email" ? maskEmail(user.email) : maskPhone(user.phone),
  };
};

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const channel = req.body.channel || "email";

    const user = await loadUserWithRoleAndPermissions({
      [Op.or]: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: `Account is ${user.account_status}`,
      });
    }

    if (!user.Role) {
      return res.status(403).json({
        message: "Account has no role assigned",
      });
    }

    if (!user.otp_enabled) {
      const loginResult = await issueLoginSession(req, user);

      return res.status(200).json({
        message: "Login successful",
        ...loginResult,
      });
    }

    if (!["email", "sms"].includes(channel)) {
      return res.status(400).json({
        message: "Channel must be email or sms",
      });
    }

    await expireOldPendingOtps(user.user_id, channel);

    const { otpRecord, sendResult, masked_destination } = await createAndSendOtp(
      user,
      channel
    );

    return res.status(200).json({
      message: "OTP sent successfully",
      requires_otp_verification: true,
      otp_channel: channel,
      otp_expires_at: otpRecord.expires_at,
      sent_to: masked_destination,
      identifier,
      ...(sendResult.debug_otp ? { debug_otp: sendResult.debug_otp } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { identifier, channel, otp_code } = req.body;

    const user = await loadUserWithRoleAndPermissions({
      [Op.or]: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: `Account is ${user.account_status}`,
      });
    }

    if (!user.otp_enabled) {
      return res.status(400).json({
        message: "OTP is not enabled for this account",
      });
    }

    const latestOtp = await OtpVerification.findOne({
      where: {
        user_id: user.user_id,
        channel,
        status: "PENDING",
        consumed_at: null,
      },
      order: [["created_at", "DESC"]],
    });

    if (!latestOtp) {
      return res.status(404).json({
        message: "No pending OTP found",
      });
    }

    if (new Date(latestOtp.expires_at) < new Date()) {
      await latestOtp.update({
        status: "EXPIRED",
      });

      return res.status(410).json({
        message: "OTP has expired",
      });
    }

    const incomingHash = hashOtpCode(otp_code);

    if (incomingHash !== latestOtp.code_hash) {
      return res.status(401).json({
        message: "Invalid OTP",
      });
    }

    await latestOtp.update({
      status: "VERIFIED",
      consumed_at: new Date(),
    });

    const loginResult = await issueLoginSession(req, user);

    return res.status(200).json({
      message: "OTP verified successfully",
      ...loginResult,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { identifier, channel } = req.body;

    const user = await loadUserWithRoleAndPermissions({
      [Op.or]: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: `Account is ${user.account_status}`,
      });
    }

    if (!user.otp_enabled) {
      return res.status(400).json({
        message: "OTP is not enabled for this account",
      });
    }

    const latestAnyOtp = await OtpVerification.findOne({
      where: {
        user_id: user.user_id,
        channel,
      },
      order: [["created_at", "DESC"]],
    });

    if (!canResendOtp(latestAnyOtp)) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    await expireOldPendingOtps(user.user_id, channel, "REPLACED");

    const { otpRecord, sendResult, masked_destination } = await createAndSendOtp(
      user,
      channel
    );

    return res.status(200).json({
      message: "OTP resent successfully",
      otp_channel: channel,
      otp_expires_at: otpRecord.expires_at,
      sent_to: masked_destination,
      identifier,
      ...(sendResult.debug_otp ? { debug_otp: sendResult.debug_otp } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const refreshTokenHash = hashToken(refresh_token);

    const session = await SessionToken.findOne({
      where: {
        token_hash: refreshTokenHash,
      },
      include: [
        {
          model: UserAccount,
          attributes: [
            "user_id",
            "role_id",
            "email",
            "phone",
            "password_hash",
            "account_status",
            "otp_enabled",
            "last_login_at",
            "created_at",
            "updated_at",
          ],
          include: [
            {
              model: Role,
              attributes: ["role_id", "role_name"],
              include: [
                {
                  model: Permission,
                  attributes: [
                    "permission_id",
                    "permission_code",
                    "permission_name",
                  ],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!session) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    if (session.revoked_at) {
      return res.status(401).json({
        message: "Session has been revoked",
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({
        message: "Refresh token has expired",
      });
    }

    const user = session.UserAccount;

    if (!user || user.account_status !== "ACTIVE") {
      return res.status(403).json({
        message: "Account is not allowed to refresh token",
      });
    }

    const claims = buildAuthClaims(user);
    const newRefreshToken = generateOpaqueRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const now = new Date();

    await session.update({
      token_hash: newRefreshTokenHash,
      issued_at: now,
      expires_at: getRefreshExpiryDate(),
      revoked_at: null,
      device_info: req.headers["user-agent"] || session.device_info,
      ip_address: getClientIp(req),
    });

    const newAccessToken = createAccessToken({
      user,
      claims,
      sessionId: session.session_id,
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: "Bearer",
      claims,
      session: {
        session_id: session.session_id,
        issued_at: session.issued_at,
        expires_at: session.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await req.session.update({
      revoked_at: new Date(),
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};