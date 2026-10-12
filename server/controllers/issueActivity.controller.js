const {
  getIssueActivities,
} = require("../services/issueActivity.service");

const getIssueActivitiesController = async (req, res) => {
  try {
    const activities = await getIssueActivities({
      issueId: req.issue._id,
    });

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Issue activities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch issue activities",
    });
  }
};

module.exports = { getIssueActivitiesController };