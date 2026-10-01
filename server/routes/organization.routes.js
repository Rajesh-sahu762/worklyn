const express = require("express");
const organizationAccess = require("../middlewares/organizationAccess");
const {
  createOrganizationController,
  getMyOrganizations,
  getOrganizationDetails,
  updateOrganizationController,
  getOrganizationMembersController,
  updateMemberRoleController,
} = require("../controllers/organization.controller");

const router = express.Router();
const authenticate = require("../middlewares/authenticate");
const authorizeOrganization = require("../middlewares/authorizeOrganization");
const {
  createInvitation,
  cancelInvitation,
  resendInvitation,
} = require("../controllers/organizationInvitation.controller");

router.post("/", authenticate, createOrganizationController);

router.get("/my", authenticate, getMyOrganizations);

router.get(
  "/:organizationId",
  authenticate,
  organizationAccess,
  getOrganizationDetails,
);

router.put(
  "/:organizationId",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  updateOrganizationController,
);

router.get(
  "/:organizationId/members",
  authenticate,
  organizationAccess,
  getOrganizationMembersController,
);

router.post(
  "/:organizationId/invitations",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  createInvitation,
);

router.delete(
  "/:organizationId/invitations/:invitationId",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  cancelInvitation,
);

router.post(
  "/:organizationId/invitations/:invitationId/resend",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER", "ADMIN"),
  resendInvitation,
);


router.patch(
  "/:organizationId/members/:memberId/role",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER"),
  updateMemberRoleController
);


module.exports = router;
