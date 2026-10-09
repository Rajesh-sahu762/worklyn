const authorizeProject = (...allowedRoles) => {
  return (req, res, next) => {
    const membership = req.projectMembership;

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Project membership required",
      });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient project permissions",
      });
    }

    next();
  };
};

module.exports = authorizeProject;