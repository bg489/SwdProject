import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import {
  UserAccount,
  Role,
  Permission,
  SessionToken,
} from "../models/index.js";
import { buildAuthClaims } from "../utils/authClaims.js";
import {
  createAccessToken,
  generateOpaqueRefreshToken,
  getClientIp,
  getRefreshExpiryDate,
  hashToken,
} from "../utils/tokenUtils.js";

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

export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

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

    return res.status(200).json({
      message: "Login successful",
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.Role.role_name,
        account_status: user.account_status,
        last_login_at: now,
      },
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