const { validateRegister } = require("../validators/auth.validator");
const { registerUser } = require("../services/auth.service");

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobile,
      password,
    } = req.body;

    // Validate input
    const errors = validateRegister({
      firstName,
      lastName,
      email,
      password,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const result = await registerUser({
      firstName,
      lastName,
      email,
      mobile,
      password,
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please verify your email.",
      data: result,
    });
  } catch (error) {
    console.error("Register Error:", error);

    if (
      error.message ===
      "User with this email already exists"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

module.exports = {
  register,
};