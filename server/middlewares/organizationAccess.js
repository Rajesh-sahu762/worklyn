const mongoose = require("mongoose");
const OrganizationMember = require("../models/OrganizationMember");

const organizationAccess = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID",
      });
    }

    const membership = await OrganizationMember.findOne({
      organization: organizationId,
      user: req.user._id,
      status: "ACTIVE",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this organization",
      });
    }

    req.organizationMembership = membership;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = organizationAccess;