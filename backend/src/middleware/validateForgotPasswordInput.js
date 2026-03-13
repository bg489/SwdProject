const validateForgotPasswordInput = (req, res, next) => {
  const { identifier, channel } = req.body;

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

  next();
};

export default validateForgotPasswordInput;