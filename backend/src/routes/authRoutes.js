import express from "express";
import { login, refreshAccessToken, logout } from "../controllers/authController.js";
import validateLoginInput from "../middleware/validateLoginInput.js";
import validateRefreshTokenInput from "../middleware/validateRefreshTokenInput.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

router.post("/login", validateLoginInput, login);
router.post("/refresh", validateRefreshTokenInput, refreshAccessToken);
router.post("/logout", authenticate, logout);

export default router;