const express = require("express");

const router = express.Router();

const {
  createOrganizationController,
  getMyOrganizations
} = require("../controllers/organization.controller");

const authenticate = require("../middlewares/authenticate");

router.post(
  "/",
  authenticate,
  createOrganizationController
);

router.get(
  "/my",
  authenticate,
  getMyOrganizations
);

module.exports = router;