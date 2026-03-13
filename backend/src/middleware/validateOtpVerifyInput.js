const validateOtpVerifyInput = (req, res, next) => {
  const { identifier, channel, otp_code } = req.body;

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

  next();
};

export default validateOtpVerifyInput;