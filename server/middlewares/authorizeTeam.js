const TeamMember = require("../models/TeamMember");

const authorizeTeam = (...allowedRoles) => async (req, res, next) => {
  try {
    const organizationRole = req.organizationMembership?.role;
    if (["OWNER", "ADMIN"].includes(organizationRole)) return next();

    const membership = await TeamMember.findOne({
      team: req.team._id,
      user: req.user._id,
      status: "ACTIVE",
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage this team",
      });
    }

    req.teamMembership = membership;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to verify team permissions" });
  }
};

module.exports = authorizeTeam;
