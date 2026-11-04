const mongoose = require("mongoose");
const Team = require("../models/Team");

const teamAccess = async (req, res, next) => {
  try {
    const { organizationId, teamId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ success: false, message: "Invalid team ID" });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: organizationId,
      isActive: true,
    });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    req.team = team;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to verify team access" });
  }
};

module.exports = teamAccess;
