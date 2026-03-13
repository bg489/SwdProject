import { getMailer } from "../config/mailer.js";

export const sendOtpEmail = async ({ to, otpCode, purpose = "LOGIN" }) => {
  const transporter = getMailer();

  if (!transporter) {
    throw new Error("Mailer is not configured or disabled");
  }

  const subject =
    purpose === "PASSWORD_RESET"
      ? "OFDS - Password Reset OTP"
      : "OFDS - Login OTP";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>OFDS Verification</h2>
      <p>Your OTP code is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">
        ${otpCode}
      </div>
      <p>This code will expire in a few minutes.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.GMAIL_USER,
    to,
    subject,
    html,
  });

  return info;
};