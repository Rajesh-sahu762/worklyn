const validateCreateOrganization = ({
  name,
  slug,
}) => {
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = "Organization name must be at least 2 characters";
  }

  if (!slug || slug.trim().length < 2) {
    errors.slug = "Organization slug must be at least 2 characters";
  }

  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers and hyphens";
  }

  return errors;
};

const validateUpdateOrganization = ({
  name,
  description,
}) => {
  const errors = {};

  if (
    name !== undefined &&
    name.trim().length < 2
  ) {
    errors.name =
      "Organization name must be at least 2 characters";
  }

  if (
    description !== undefined &&
    description.trim().length > 500
  ) {
    errors.description =
      "Description cannot exceed 500 characters";
  }

  return errors;
};

module.exports = {
  validateCreateOrganization,
  validateUpdateOrganization,
};