const validateCreateProject = ({
  name,
  key,
  slug,
  projectType,
}) => {
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name =
      "Project name must be at least 2 characters";
  }

  if (!key) {
    errors.key = "Project key is required";
  } else if (
    !/^[A-Za-z][A-Za-z0-9]{1,9}$/.test(key)
  ) {
    errors.key =
      "Project key must start with a letter and contain 2-10 characters";
  }

  if (!slug) {
    errors.slug = "Project slug is required";
  } else if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers and hyphens";
  }

  if (
    projectType &&
    !["SCRUM", "KANBAN"].includes(projectType)
  ) {
    errors.projectType =
      "Project type must be SCRUM or KANBAN";
  }

  return errors;
};

module.exports = {
  validateCreateProject,
};