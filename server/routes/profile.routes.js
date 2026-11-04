const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const { updateProfileController, updatePreferencesController } = require("../controllers/profile.controller");

router.patch("/profile", authenticate, updateProfileController);
router.patch("/profile/preferences", authenticate, updatePreferencesController);

module.exports = router;
