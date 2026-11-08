const mongoose = require("mongoose");

<<<<<<< Updated upstream
const sprintSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    goal: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["PLANNED", "ACTIVE", "COMPLETED"],
      default: "PLANNED",
      required: true,
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
=======
const sprintSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,

>>>>>>> Stashed changes
  },
  { timestamps: true },
);

sprintSchema.index(
  { project: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } },
);
sprintSchema.index({ project: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Sprint", sprintSchema);
