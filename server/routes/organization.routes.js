const express = require("express");
const organizationAccess = require("../middlewares/organizationAccess")
const {
    createOrganizationController,
    getMyOrganizations,
    getOrganizationDetails
} = require("../controllers/organization.controller");

const router = express.Router();
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

router.get(
  "/:organizationId",
  authenticate,
  organizationAccess,
  getOrganizationDetails
);

module.exports = router;