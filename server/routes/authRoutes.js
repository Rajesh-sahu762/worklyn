const express = require("express");
const router = express.Router();


router.post("/register", registerUser);

// Login Route
router.post("/login", LoginUser);


module.exports = router;
