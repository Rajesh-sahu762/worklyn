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

module.exports = {
  createOrganization,
  getUserOrganizations,
  
};
