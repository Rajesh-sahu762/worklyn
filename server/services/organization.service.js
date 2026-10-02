const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const createOrganization = async ({ name, slug, description, userId }) => {
  const existingOrganization = await Organization.findOne({
    slug: slug.toLowerCase(),
  });

  if (existingOrganization) {
    throw new Error("Organization slug already exists");
  }

  const organization = await Organization.create({
    name: name.trim(),
    slug: slug.toLowerCase().trim(),
    description: description?.trim() || "",
    owner: userId,
  });

  await OrganizationMember.create({
    organization: organization._id,
    user: userId,
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  return organization;
};

const getUserOrganizations = async (userId) => {
  const memberships = await OrganizationMember.find({
    user: userId,
    status: "ACTIVE",
  })
    .populate("organization")
    .sort({ createdAt: -1 });

  return memberships.map((membership) => ({
    organization: membership.organization,
    role: membership.role,
    membershipId: membership._id,
  }));
};

const getOrganizationById = async (organizationId) => {
  const organization = await Organization.findById(
    organizationId
  ).select("-__v");

  if (!organization) {
    throw new Error("Organization not found");
  }

  return organization;
};

const updateOrganization = async ({
  organizationId,
  name,
  description,
  logo,
}) => {
  const organization = await Organization.findById(
    organizationId
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (name !== undefined) {
    organization.name = name.trim();
  }

  if (description !== undefined) {
    organization.description = description.trim();
  }

  if (logo !== undefined) {
    organization.logo = logo.trim();
  }

  await organization.save();

  return organization;
};

const getOrganizationMembers = async (organizationId) => {
  const members = await OrganizationMember.find({
    organization: organizationId,
    status: "ACTIVE",
  })
    .populate({
      path: "user",
      select: "firstName lastName email profileImage",
    })
    .sort({ createdAt: 1 });

  return members;
};


const updateMemberRole = async ({
  organizationId,
  memberId,
  role,
}) => {
  const member = await OrganizationMember.findOne({
    _id: memberId,
    organization: organizationId,
    status: "ACTIVE",
  });

  if (!member) {
    throw new Error("Organization member not found");
  }

  // Owner role cannot be changed from this API
  if (member.role === "OWNER") {
    throw new Error(
      "Organization owner role cannot be changed"
    );
  }

  if (!["ADMIN", "MEMBER"].includes(role)) {
    throw new Error("Invalid organization role");
  }

  member.role = role;

  await member.save();

  return member;
};

const removeOrganizationMember = async ({
  organizationId,
  memberId,
}) => {
  const member = await OrganizationMember.findOne({
    _id: memberId,
    organization: organizationId,
    status: "ACTIVE",
  });

  if (!member) {
    throw new Error("Organization member not found");
  }

  // Owner cannot be removed
  if (member.role === "OWNER") {
    throw new Error(
      "Organization owner cannot be removed"
    );
  }

  // Soft remove instead of deleting the document
  member.status = "REMOVED";

  await member.save();

  return member;
};

const leaveOrganization = async ({
  organizationId,
  userId,
}) => {
  const membership = await OrganizationMember.findOne({
    organization: organizationId,
    user: userId,
    status: "ACTIVE",
  });

  if (!membership) {
    throw new Error(
      "You are not an active member of this organization"
    );
  }

  // Owner cannot leave directly
  if (membership.role === "OWNER") {
    throw new Error(
      "Organization owner cannot leave. Transfer ownership first."
    );
  }

  // Soft remove membership
  membership.status = "REMOVED";

  await membership.save();

  return membership;
};

const mongoose = require("mongoose");

const transferOrganizationOwnership = async ({
  organizationId,
  currentOwnerId,
  newOwnerMemberId,
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Find current owner membership
    const currentOwner =
      await OrganizationMember.findOne({
        organization: organizationId,
        user: currentOwnerId,
        role: "OWNER",
        status: "ACTIVE",
      }).session(session);

    if (!currentOwner) {
      throw new Error(
        "You are not the owner of this organization"
      );
    }

    // 2. Find target member
    const newOwner =
      await OrganizationMember.findOne({
        _id: newOwnerMemberId,
        organization: organizationId,
        status: "ACTIVE",
      }).session(session);

    if (!newOwner) {
      throw new Error(
        "Target member not found"
      );
    }

    // 3. Cannot transfer ownership to yourself
    if (
      currentOwner._id.toString() ===
      newOwner._id.toString()
    ) {
      throw new Error(
        "You are already the owner of this organization"
      );
    }

    // 4. Update organization owner
    const organization =
      await Organization.findByIdAndUpdate(
        organizationId,
        {
          owner: newOwner.user,
        },
        {
          new: true,
          session,
        }
      );

    if (!organization) {
      throw new Error("Organization not found");
    }

    // 5. Old owner becomes ADMIN
    currentOwner.role = "ADMIN";

    await currentOwner.save({
      session,
    });

    // 6. Target becomes OWNER
    newOwner.role = "OWNER";

    await newOwner.save({
      session,
    });

    // 7. Commit transaction
    await session.commitTransaction();

    return {
      organization,
      previousOwner: currentOwner,
      newOwner,
    };
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }
};


module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
  updateMemberRole,
  removeOrganizationMember,
  leaveOrganization,
  transferOrganizationOwnership
};
