const express = require("express");
const router = express.Router();
const {
  register,
  verifyEmailController,
  resendVerificationOtpController,
  login,
  getMe,
  refresh
} = require("../controllers/auth.controller");

const authenticate = require("../middlewares/authenticate");

// Login Route
router.post("/login", login);

router.post("/register", register);

router.get("/me", authenticate , getMe)

router.post("/refresh", refresh);

// router.post("/logout", logoutUser);

router.post("/verify-email", verifyEmailController);

router.post("/resend-verification", resendVerificationOtpController);

// router.get("/me", getCurrentUser);


module.exports = router;
