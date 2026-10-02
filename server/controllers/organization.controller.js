const {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
  updateMemberRole,
  removeOrganizationMember,
  leaveOrganization,
  transferOrganizationOwnership
} = require("../services/organization.service");

const {
  validateCreateOrganization,
  validateUpdateOrganization,
  validateUpdateMemberRole,
} = require("../validators/organization.validator");

const createOrganizationController = async (req, res) => {
  try {
    const errors = validateCreateOrganization(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const { name, slug, description } = req.body;

    const organization = await createOrganization({
      name,
      slug,
      description,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: {
        organization,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Organization slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyOrganizations = async (req, res) => {
  try {
    const organizations = await getUserOrganizations(req.user._id);

    return res.status(200).json({
      success: true,
      data: {
        organizations,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getOrganizationDetails = async (req, res) => {
  try {
    const organization = await getOrganizationById(req.params.organizationId);

    return res.status(200).json({
      success: true,
      data: {
        organization,
        role: req.organizationMembership.role,
      },
    });
  } catch (error) {
    if (error.message === "Organization not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOrganizationController = async (req, res) => {
  try {
    const errors = validateUpdateOrganization(
      req.body
    );

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const organization =
      await updateOrganization({
        organizationId:
          req.params.organizationId,

        name: req.body.name,
        description: req.body.description,
        logo: req.body.logo,
      });

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: {
        organization,
      },
    });
  } catch (error) {
    if (error.message === "Organization not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getOrganizationMembersController = async (req, res) => {
  try {
    const members = await getOrganizationMembers(
      req.params.organizationId
    );

    return res.status(200).json({
      success: true,
      data: {
        members,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const updateMemberRoleController = async (
  req,
  res
) => {
  try {
    const errors =
      validateUpdateMemberRole(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const member =
      await updateMemberRole({
        organizationId:
          req.params.organizationId,

        memberId:
          req.params.memberId,

        role: req.body.role,
      });

    return res.status(200).json({
      success: true,
      message:
        "Organization member role updated successfully",

      data: {
        member,
      },
    });
  } catch (error) {
    if (
      error.message ===
        "Organization member not found" ||
      error.message ===
        "Organization owner role cannot be changed" ||
      error.message ===
        "Invalid organization role"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeOrganizationMemberController = async (
  req,
  res
) => {
  try {
    const member =
      await removeOrganizationMember({
        organizationId:
          req.params.organizationId,

        memberId:
          req.params.memberId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Organization member removed successfully",

      data: {
        member,
      },
    });
  } catch (error) {
    if (
      error.message ===
        "Organization member not found" ||
      error.message ===
        "Organization owner cannot be removed"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const leaveOrganizationController = async (
  req,
  res
) => {
  try {
    await leaveOrganization({
      organizationId:
        req.params.organizationId,

      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "You have left the organization successfully",
    });
  } catch (error) {
    if (
      error.message ===
        "You are not an active member of this organization" ||
      error.message ===
        "Organization owner cannot leave. Transfer ownership first."
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const transferOwnershipController = async (
  req,
  res
) => {
  try {
    const {
      newOwnerMemberId,
    } = req.body;

    if (!newOwnerMemberId) {
      return res.status(400).json({
        success: false,
        message:
          "New owner member ID is required",
      });
    }

    const result =
      await transferOrganizationOwnership({
        organizationId:
          req.params.organizationId,

        currentOwnerId:
          req.user._id,

        newOwnerMemberId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Organization ownership transferred successfully",

      data: {
        organization: result.organization,
        previousOwner: result.previousOwner,
        newOwner: result.newOwner,
      },
    });
  } catch (error) {
    const clientErrors = [
      "You are not the owner of this organization",
      "Target member not found",
      "You are already the owner of this organization",
      "Organization not found",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOrganizationController,
  getMyOrganizations,
  getOrganizationDetails,
  updateOrganizationController,
  getOrganizationMembersController,
  updateMemberRoleController,
  removeOrganizationMemberController,
  leaveOrganizationController,
  transferOwnershipController
};
