// models/ProjectMember.js

const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["PROJECT_ADMIN", "MEMBER", "VIEWER"],
      default: "MEMBER",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "REMOVED"],
      default: "ACTIVE",
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    joinedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectMemberSchema.index(
  { project: 1, user: 1 },
  { unique: true }
);

module.exports = mongoose.model("ProjectMember", projectMemberSchema);