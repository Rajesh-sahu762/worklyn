// models/Project.js

const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    projectType: {
      type: String,
      enum: ["SCRUM", "KANBAN"],
      default: "SCRUM",
      required: true,
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Project key should be unique inside an organization
projectSchema.index(
  { organization: 1, key: 1 },
  { unique: true }
);

projectSchema.index(
  { organization: 1, slug: 1 },
  { unique: true }
);

module.exports = mongoose.model("Project", projectSchema);