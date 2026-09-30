const validateCreateInvitation = ({
  email,
  role,
}) => {
  const errors = {};

  if (!email) {
    errors.email = "Email is required";
  } else {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }
  }

  if (!role) {
    errors.role = "Role is required";
  } else if (!["ADMIN", "MEMBER"].includes(role)) {
    errors.role = "Invalid organization role";
  }

  return errors;
};

module.exports = {
  validateCreateInvitation,
};