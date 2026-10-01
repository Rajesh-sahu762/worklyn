const OrganizationInvitation = require("../models/OrganizationInvitation");
const OrganizationMember = require("../models/OrganizationMember");
const User = require("../models/User");
const Organization = require("../models/Organization");

const generateInviteToken = require("../utils/generateInviteToken");

const hashToken = require("../utils/hashToken");

const createOrganizationInvitation = async ({
  organizationId,
  email,
  role,
  invitedBy,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check organization
  const organization = await Organization.findById(organizationId);

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
    const existingMember = await OrganizationMember.findOne({
      organization: organizationId,
      user: user._id,
      status: {
        $in: ["ACTIVE", "INVITED"],
      },
    });

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }
  }

  // 4. Check existing pending invitation
  const existingInvitation = await OrganizationInvitation.findOne({
    organization: organizationId,
    email: normalizedEmail,
    status: "PENDING",
    expiresAt: { $gt: new Date() },
  });

  if (existingInvitation) {
    throw new Error("A pending invitation already exists for this email");
  }

  // 5. Generate secure token
  const inviteToken = generateInviteToken();

  // 6. Hash token before storing
  const tokenHash = hashToken(inviteToken);

  // 7. Invitation expires after 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 8. Create invitation
  const invitation = await OrganizationInvitation.create({
    organization: organizationId,
    email: normalizedEmail,
    role,
    tokenHash,
    invitedBy,
    status: "PENDING",
    expiresAt,
  });

  // Temporary development link
  const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${inviteToken}`;

  return {
    invitation,
    invitationLink,
  };
};

const acceptOrganizationInvitation = async ({ token, userId }) => {
  if (!token) {
    throw new Error("Invitation token is required");
  }

  // 1. Hash incoming token
  const tokenHash = hashToken(token);

  // 2. Find invitation
  const invitation = await OrganizationInvitation.findOne({
    tokenHash,
  }).populate("organization");

  if (!invitation) {
    throw new Error("Invalid invitation");
  }

  // 3. Invitation must be pending
  if (invitation.status !== "PENDING") {
    throw new Error("This invitation is no longer valid");
  }

  // 4. Check expiry
  if (invitation.expiresAt <= new Date()) {
    invitation.status = "EXPIRED";

    await invitation.save();

    throw new Error("Invitation has expired");
  }

  // 5. Get logged-in user
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isDeleted || user.deactivatedAt) {
    throw new Error("User account is not active");
  }

  // 6. CRITICAL EMAIL CHECK
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  // 7. Check existing membership
  const existingMembership = await OrganizationMember.findOne({
    organization: invitation.organization._id,
    user: user._id,
  });

  if (existingMembership) {
    if (existingMembership.status === "ACTIVE") {
      throw new Error("You are already a member of this organization");
    }

    existingMembership.status = "ACTIVE";
    existingMembership.role = invitation.role;
    existingMembership.joinedAt = new Date();

    await existingMembership.save();
  } else {
    // 8. Create membership
    await OrganizationMember.create({
      organization: invitation.organization._id,
      user: user._id,
      role: invitation.role,
      status: "ACTIVE",
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    });
  }

  // 9. Mark invitation as accepted
  invitation.status = "ACCEPTED";
  invitation.acceptedAt = new Date();

  await invitation.save();

  return {
    organization: invitation.organization,
    role: invitation.role,
  };
};

module.exports = {
  createOrganizationInvitation,
  acceptOrganizationInvitation,
};
