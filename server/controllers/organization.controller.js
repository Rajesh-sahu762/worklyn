const {
  createOrganization,
  getUserOrganizations
} = require("../services/organization.service");

const {
  validateCreateOrganization,
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

    const {
      name,
      slug,
      description,
    } = req.body;

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
    const organizations = await getUserOrganizations(
      req.user._id
    );

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

module.exports = {
  createOrganizationController,
  getMyOrganizations
};