const mongoose = require("mongoose");

const issueActivitySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "ISSUE_CREATED",
        "ISSUE_UPDATED",
        "STATUS_CHANGED",
      ],
      required: true,
    },
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        from: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        to: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);

issueActivitySchema.index({
  issue: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "IssueActivity",
  issueActivitySchema
);