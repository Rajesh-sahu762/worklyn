const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
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

    issueNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    issueKey: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      maxlength: 10000,
    },

    type: {
      type: String,
      enum: [
        "EPIC",
        "STORY",
        "TASK",
        "BUG",
        "SUB_TASK",
      ],
      default: "TASK",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "BACKLOG",
        "TODO",
        "IN_PROGRESS",
        "IN_REVIEW",
        "DONE",
      ],
      default: "TODO",
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: [
        "LOWEST",
        "LOW",
        "MEDIUM",
        "HIGH",
        "HIGHEST",
      ],
      default: "MEDIUM",
      required: true,
      index: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    parentIssue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
    },

    labels: {
      type: [String],
      default: [],
    },

    dueDate: {
      type: Date,
      default: null,
    },

    estimate: {
      type: Number,
      default: null,
      min: 0,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate issue numbers within a project.
issueSchema.index(
  { project: 1, issueNumber: 1 },
  { unique: true }
);

// Prevent duplicate issue keys within a project.
issueSchema.index(
  { project: 1, issueKey: 1 },
  { unique: true }
);

// Common project board query.
issueSchema.index({
  project: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Issue", issueSchema);