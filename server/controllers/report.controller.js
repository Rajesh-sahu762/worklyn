const { reportProjectSummary } = require("../services/report.service");

const projectSummaryController = async (req, res) => {
  try {
    const summary = await reportProjectSummary(req.project._id);
    return res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    console.error("Project report error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate project report" });
  }
};

module.exports = { projectSummaryController };
