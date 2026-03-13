import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateOpaqueRefreshToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const hashToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

export const createAccessToken = ({ user, claims, sessionId }) => {
  return jwt.sign(
    {
      sub: user.user_id,
      session_id: sessionId,
      role_id: user.role_id,
      role: claims.role,
      permissions: claims.permissions,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

export const getRefreshExpiryDate = () => {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now;
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};