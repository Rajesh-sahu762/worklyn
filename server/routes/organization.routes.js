const express = require("express");
const organizationAccess = require("../middlewares/organizationAccess")
const {
    createOrganizationController,
    getMyOrganizations,
    getOrganizationDetails,
    updateOrganizationController
} = require("../controllers/organization.controller");

const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorizeOrganization = require(
  "../middlewares/authorizeOrganization"
);


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

router.put(
  "/:organizationId",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  updateOrganizationController
);

module.exports = router;