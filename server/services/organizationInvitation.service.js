const OrganizationInvitation = require("../models/OrganizationInvitation");
const OrganizationMember = require("../models/OrganizationMember");
const User = require("../models/User");
const Organization = require("../models/Organization");

const generateInviteToken = require(
  "../utils/generateInviteToken"
);

const hashToken = require("../utils/hashToken");

const createOrganizationInvitation = async ({
  organizationId,
  email,
  role,
  invitedBy,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check organization
  const organization = await Organization.findById(
    organizationId
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  // 2. Check whether user already exists
  const user = await User.findOne({
    email: normalizedEmail,
    isDeleted: false,
  });

  // 3. If user exists, check existing membership
  if (user) {
    const existingMember =
      await OrganizationMember.findOne({
        organization: organizationId,
        user: user._id,
        status: {
          $in: ["ACTIVE", "INVITED"],
        },
      });

    if (existingMember) {
      throw new Error(
        "User is already a member of this organization"
      );
    }
  }

  // 4. Check existing pending invitation
  const existingInvitation =
    await OrganizationInvitation.findOne({
      organization: organizationId,
      email: normalizedEmail,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

  if (existingInvitation) {
    throw new Error(
      "A pending invitation already exists for this email"
    );
  }

  // 5. Generate secure token
  const inviteToken = generateInviteToken();

  // 6. Hash token before storing
  const tokenHash = hashToken(inviteToken);

  // 7. Invitation expires after 7 days
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  // 8. Create invitation
  const invitation =
    await OrganizationInvitation.create({
      organization: organizationId,
      email: normalizedEmail,
      role,
      tokenHash,
      invitedBy,
      status: "PENDING",
      expiresAt,
    });

  // Temporary development link
  const invitationLink =
    `${process.env.FRONTEND_URL}/accept-invitation?token=${inviteToken}`;

  return {
    invitation,
    invitationLink,
  };
};

module.exports = {
  createOrganizationInvitation,
};