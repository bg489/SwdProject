const validateResetPasswordInput = (req, res, next) => {
  const { identifier, channel, otp_code, new_password, confirm_password } = req.body;

  if (!identifier || typeof identifier !== "string" || identifier.trim() === "") {
    return res.status(400).json({
      message: "Identifier is required",
    });
  }

  if (!channel || !["email", "sms"].includes(channel)) {
    return res.status(400).json({
      message: "Channel must be email or sms",
    });
  }

  if (!otp_code || typeof otp_code !== "string" || !/^\d{6}$/.test(otp_code)) {
    return res.status(400).json({
      message: "OTP code must be a 6-digit string",
    });
  }

  if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters",
    });
  }

  if (!confirm_password || confirm_password !== new_password) {
    return res.status(400).json({
      message: "Confirm password does not match",
    });
  }

  next();
};

export default validateResetPasswordInput;