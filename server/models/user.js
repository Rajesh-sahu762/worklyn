// models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    tokenVersion: { type: Number, default: 0, min: 0 },

    profileImage: {
      type: String,
      default: "",
    },

    preferences: {
      notifications: {
        ISSUE_ASSIGNED: { type: Boolean, default: true },
        ISSUE_STATUS_CHANGED: { type: Boolean, default: true },
        ISSUE_COMMENTED: { type: Boolean, default: true },
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    otpAttempts: { type: Number, default: 0, min: 0, max: 5 },
    otpLastSentAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, index: true },
    passwordResetExpiresAt: { type: Date, default: null },
    passwordResetRequestedAt: { type: Date, default: null },

    googleId: {
      type: String,
      default: null,
      sparse: true,
    },

    facebookId: {
      type: String,
      default: null,
      sparse: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
