import { SessionToken } from "../models/index.js";
import { verifyAccessToken } from "../utils/tokenUtils.js";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const session = await SessionToken.findOne({
      where: {
        session_id: decoded.session_id,
      },
    });

    if (!session) {
      return res.status(401).json({
        message: "Session not found",
      });
    }

    if (session.revoked_at) {
      return res.status(401).json({
        message: "Session has been revoked",
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({
        message: "Session has expired",
      });
    }

    req.auth = decoded;
    req.session = session;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
};

export default authenticate;