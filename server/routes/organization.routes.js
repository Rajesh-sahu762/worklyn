const express = require("express");
const organizationAccess = require("../middlewares/organizationAccess")
const {
    createOrganizationController,
    getMyOrganizations,
    getOrganizationDetails,
    updateOrganizationController,
    getOrganizationMembersController
} = require("../controllers/organization.controller");

const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorizeOrganization = require(
  "../middlewares/authorizeOrganization"
);
const { createInvitation } = require("../controllers/organizationInvitation.controller");


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


router.get(
  "/:organizationId/members",
  authenticate,
  organizationAccess,
  getOrganizationMembersController
);

router.post(
  "/:organizationId/invitations",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  createInvitation
);

module.exports = router;