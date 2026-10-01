const {
  createOrganizationInvitation,
} = require("../services/organizationInvitation.service");

const {
  validateCreateInvitation,
} = require("../validators/organizationInvitation.validator");

const createInvitation = async (req, res) => {
  try {
    const errors = validateCreateInvitation(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const { email, role } = req.body;

    const result = await createOrganizationInvitation({
      organizationId: req.params.organizationId,

      email,
      role,

      invitedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Organization invitation created successfully",

      data: {
        invitation: result.invitation,

        // Development only
        invitationLink: result.invitationLink,
      },
    });
  } catch (error) {
    if (error.message === "Organization not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "User is already a member of this organization" ||
      error.message === "A pending invitation already exists for this email"
    ) {
      return res.status(409).json({
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

const {
  acceptOrganizationInvitation,
} = require("../services/organizationInvitation.service");

const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    const result = await acceptOrganizationInvitation({
      token,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Organization invitation accepted successfully",

      data: {
        organization: result.organization,
        role: result.role,
      },
    });
  } catch (error) {
    const badRequestErrors = [
      "Invitation token is required",
      "Invalid invitation",
      "This invitation is no longer valid",
      "Invitation has expired",
      "User not found",
      "User account is not active",
      "This invitation was sent to a different email address",
      "You are already a member of this organization",
    ];

    if (badRequestErrors.includes(error.message)) {
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
  createInvitation,
  acceptInvitation,
};
