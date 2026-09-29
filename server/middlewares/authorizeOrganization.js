const authorizeOrganization = (...allowedRoles) => {
  return (req, res, next) => {
    const membership = req.organizationMembership;

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Organization membership required",
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action",
      });
    }

    next();
  };
};

module.exports = authorizeOrganization;