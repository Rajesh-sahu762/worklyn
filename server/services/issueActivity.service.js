const IssueActivity = require("../models/IssueActivity");

const getIssueActivities = async ({ issueId }) => {
  return IssueActivity.find({ issue: issueId })
    .populate("actor", "firstName lastName profileImage")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

module.exports = { getIssueActivities };