const express = require("express");
const router = express.Router();
const {
  register,
} = require("../controllers/auth.controller");

// Login Route
// router.post("/login", LoginUser);

router.post("/register", register);

// router.post("/refresh", refreshToken);

// router.post("/logout", logoutUser);

// router.post("/verify-email", verifyEmail);

// router.post("/resend-verification", resendVerificationEmail);

// router.get("/me", getCurrentUser);


module.exports = router;
