const validateRegister = ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const errors = {};

  if (!firstName || firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters";
  }

  if (!email) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }
  }

  if (!password || password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
};

module.exports = {
  validateRegister,
};