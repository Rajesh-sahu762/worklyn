const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAccessToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    {
      userId,
      tokenVersion,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "30m",
    },
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_REFRESH_TOKEN,
    {
      expiresIn: "7d",
      // Unique id per token. Without it, two tokens created in the same second
      // for the same user are identical, and the unique tokenHash index would
      // reject the rotated one.
      jwtid: crypto.randomUUID(),
    },
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
