const { validateRegister } = require("../validators/auth.validator");
const { registerUser , verifyEmail , resendVerificationOtp } = require("../services/auth.service");

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


const verifyEmailController = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    const result = await verifyEmail({
      userId,
      otp,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    console.error("Verify Email Error:", error);

    const clientErrors = [
      "User not found",
      "User account has been deleted",
      "Email is already verified",
      "Verification OTP not found",
      "OTP has expired",
      "Invalid OTP",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
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

const resendVerificationOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await resendVerificationOtp({
      email,
    });

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Resend Verification OTP Error:",
      error
    );

    const clientErrors = [
      "User not found",
      "User account has been deleted",
      "Email is already verified",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(400).json({
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
  verifyEmailController,
  resendVerificationOtpController
};