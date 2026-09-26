// models/TeamMember.js

const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
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
      enum: ["TEAM_LEAD", "MEMBER"],
      default: "MEMBER",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INVITED", "REMOVED"],
      default: "ACTIVE",
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

teamMemberSchema.index(
  { team: 1, user: 1 },
  { unique: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);