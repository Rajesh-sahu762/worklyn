const {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
  updateMemberRole
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


module.exports = {
  createOrganizationController,
  getMyOrganizations,
  getOrganizationDetails,
  updateOrganizationController,
  getOrganizationMembersController,
  updateMemberRoleController,

};
