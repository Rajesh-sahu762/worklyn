const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "ISSUE_ASSIGNED",
        "ISSUE_STATUS_CHANGED",
        "ISSUE_COMMENTED",
        "ISSUE_BACKLOG_UPDATED",
        "ORGANIZATION_INVITATION",
        "INVITATION_ACCEPTED",
        "TEAM_MEMBER_ADDED",
        "PROJECT_MEMBER_ADDED",
        "PROJECT_CREATED",
        "SPRINT_CREATED",
        "SPRINT_UPDATED",
        "SPRINT_STARTED",
        "SPRINT_COMPLETED",
        "SPRINT_ISSUE_ADDED",
        "SPRINT_ISSUE_REMOVED",
      ],
      required: true,
    },
    message: { type: String, required: true, maxlength: 300 },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
