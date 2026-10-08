const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authenticate");

const organizationAccess = require("../middlewares/organizationAccess");

const authorizeOrganization = require("../middlewares/authorizeOrganization");

const {
  createProjectController,
} = require("../controllers/project.controller");

router.post(
  "/organizations/:organizationId/projects",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  createProjectController,
);

module.exports = router;
