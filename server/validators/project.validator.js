const mongoose = require("mongoose");

const validateCreateProject = (body = {}) => {
  const { name, key, slug, projectType, lead, teamIds } = body;
  const errors = {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) errors.name = "Project name must be between 2 and 100 characters";
  if (typeof key !== "string" || !/^[A-Za-z][A-Za-z0-9]{1,9}$/.test(key)) errors.key = "Project key must start with a letter and contain 2-10 characters";
  if (typeof slug !== "string" || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = "Slug can only contain lowercase letters, numbers and hyphens";
  if (projectType !== undefined && !["SCRUM", "KANBAN"].includes(projectType)) errors.projectType = "Project type must be SCRUM or KANBAN";
  if (lead !== undefined && (typeof lead !== "string" || !mongoose.isValidObjectId(lead))) errors.lead = "Invalid project lead";
  if (teamIds !== undefined && (!Array.isArray(teamIds) || teamIds.length > 50 || teamIds.some(id => typeof id !== "string" || !mongoose.isValidObjectId(id)) || new Set(teamIds).size !== teamIds.length)) errors.teamIds = "Select up to 50 valid, unique teams";
  if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 1000)) errors.description = "Description cannot exceed 1000 characters";
  return errors;
};

module.exports = { validateCreateProject };
