import crypto from "crypto";

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

export const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email;
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
};

/**
 * Stub gửi OTP.
 * Hiện tại chưa tích hợp SMS/Email provider thật.
 * Dev mode: trả debug_otp để test.
 * Prod: chỉ log, không trả OTP ra client.
 */
export const sendOtpOutOfBand = async ({ channel, destination, code }) => {
  console.log(`[OTP][${channel}] send to ${destination}: ${code}`);

  if (process.env.NODE_ENV !== "production") {
    return {
      debug_otp: code,
    };
  }

  return {};
};