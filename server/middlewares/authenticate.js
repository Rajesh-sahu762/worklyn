const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

    // Find user
    const user = await User.findById(decoded.userId).select(
      "-passwordHash -otp -otpExpiresAt -googleId -facebookId"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "User account has been deleted",
      });
    }

    if (user.deactivatedAt) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Email verification required",
      });
    }

    // Attach authenticated user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    console.error("Authentication Error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authenticate;