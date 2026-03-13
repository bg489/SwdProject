const validateLoginInput = (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || typeof identifier !== "string" || identifier.trim() === "") {
    return res.status(400).json({
      message: "Identifier is required",
    });
  }

  if (!password || typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({
      message: "Password is required",
    });
  }

  next();
};

export default validateLoginInput;