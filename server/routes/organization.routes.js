const express = require("express");
const organizationAccess = require("../middlewares/organizationAccess");
const {
  createOrganizationController,
  getMyOrganizations,
  getOrganizationDetails,
  updateOrganizationController,
  getOrganizationMembersController,
  updateMemberRoleController,
  removeOrganizationMemberController,
  leaveOrganizationController,
  transferOwnershipController,
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


router.delete(
  "/:organizationId/members/:memberId",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER"),
  removeOrganizationMemberController
);

router.delete(
  "/:organizationId/leave",
  authenticate,
  organizationAccess,
  leaveOrganizationController
);

router.patch(
  "/:organizationId/transfer-ownership",
  authenticate,
  organizationAccess,
  authorizeOrganization("OWNER"),
  transferOwnershipController
);

module.exports = router;
