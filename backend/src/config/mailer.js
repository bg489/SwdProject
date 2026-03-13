import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const mailEnabled = String(process.env.MAIL_ENABLED).toLowerCase() === "true";

let transporter = null;

if (mailEnabled) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export const getMailer = () => transporter;

export const verifyMailer = async () => {
  if (!transporter) {
    console.log("Mailer is disabled");
    return false;
  }

  await transporter.verify();
  return true;
};