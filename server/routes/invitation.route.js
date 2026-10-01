const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authenticate");

const {
  acceptInvitation,
} = require("../controllers/organizationInvitation.controller");

router.post("/accept", authenticate, acceptInvitation);

module.exports = router;
