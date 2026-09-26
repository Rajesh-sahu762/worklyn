const express = require("express");
const router = express.Router();


// Login Route
router.post("/login", LoginUser);

router.post("/register", registerUser);

router.post("/refresh", refreshToken);

router.post("/logout", logoutUser);

router.post("/verify-email", verifyEmail);

router.post("/resend-verification", resendVerificationEmail);

router.get("/me", getCurrentUser);


module.exports = router;
