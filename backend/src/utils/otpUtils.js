import crypto from "crypto";
import { sendOtpEmail } from "../services/emailService.js";

export const OTP_PURPOSES = {
  LOGIN: "LOGIN",
  PASSWORD_RESET: "PASSWORD_RESET",
};

export const isSupportedOtpChannel = (channel) => {
  return ["email", "sms"].includes((channel || "").toLowerCase());
};

export const buildOtpChannelKey = ({ purpose, channel }) => {
  return `${purpose}_${channel.toUpperCase()}`;
};

export const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOtpCode = (otpCode) => {
  return crypto.createHash("sha256").update(otpCode).digest("hex");
};

export const getOtpExpiryDate = () => {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES || 5);
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
};

export const canResendOtp = (latestOtp) => {
  if (!latestOtp) return true;

  const cooldownSeconds = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
  const createdAt = new Date(latestOtp.created_at).getTime();
  const now = Date.now();

  return now - createdAt >= cooldownSeconds * 1000;
};

export const getOtpDestination = (user, channel) => {
  return channel === "email" ? user.email : user.phone;
};

export const getMaskedOtpDestination = (user, channel) => {
  if (channel === "email") {
    const email = user.email;
    if (!email || !email.includes("@")) return email;

    const [name, domain] = email.split("@");
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }

  const phone = user.phone;
  if (!phone || phone.length < 4) return phone;
  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
};

export const sendOtpOutOfBand = async ({
  channel,
  destination,
  code,
  purpose = OTP_PURPOSES.LOGIN,
}) => {
  if (channel === "email") {
    const mailEnabled =
      String(process.env.MAIL_ENABLED).toLowerCase() === "true";

    if (mailEnabled) {
      await sendOtpEmail({
        to: destination,
        otpCode: code,
        purpose,
      });

      return {
        delivery: "email",
      };
    }

    console.log(`[DEV OTP EMAIL] to=${destination} code=${code}`);

    return process.env.NODE_ENV !== "production"
      ? {
          delivery: "debug",
          debug_otp: code,
        }
      : {
          delivery: "disabled",
        };
  }

  console.log(`[DEV OTP SMS] to=${destination} code=${code}`);

  return process.env.NODE_ENV !== "production"
    ? {
        delivery: "debug",
        debug_otp: code,
      }
    : {
        delivery: "disabled",
      };
};