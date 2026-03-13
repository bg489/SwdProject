import express from "express";
import {
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
} from "../controllers/authController.js";

import validateLoginInput from "../middleware/validateLoginInput.js";
import validateOtpVerifyInput from "../middleware/validateOtpVerifyInput.js";
import validateOtpResendInput from "../middleware/validateOtpResendInput.js";
import validateForgotPasswordInput from "../middleware/validateForgotPasswordInput.js";
import validateResetPasswordInput from "../middleware/validateResetPasswordInput.js";
import validateRefreshTokenInput from "../middleware/validateRefreshTokenInput.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

router.post("/login", validateLoginInput, login);
router.post("/verify-otp", validateOtpVerifyInput, verifyOtp);
router.post("/resend-otp", validateOtpResendInput, resendOtp);

router.post("/forgot-password", validateForgotPasswordInput, forgotPassword);
router.post("/reset-password", validateResetPasswordInput, resetPassword);

router.post("/refresh", validateRefreshTokenInput, refreshAccessToken);
router.post("/logout", authenticate, logout);

export default router;