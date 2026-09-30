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

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
};
