// models/OrganizationMember.js

const mongoose = require("mongoose");

const organizationMemberSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
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
      enum: ["OWNER", "ADMIN", "MEMBER"],
      default: "MEMBER",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "SUSPENDED", "REMOVED"],
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

// Same user cannot have duplicate membership
organizationMemberSchema.index(
  { organization: 1, user: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "OrganizationMember",
  organizationMemberSchema
);