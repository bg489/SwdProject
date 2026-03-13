const validateRefreshTokenInput = (req, res, next) => {
  const { refresh_token } = req.body;

  if (
    !refresh_token ||
    typeof refresh_token !== "string" ||
    refresh_token.trim() === ""
  ) {
    return res.status(400).json({
      message: "Refresh token is required",
    });
  }

  next();
};

export default validateRefreshTokenInput;