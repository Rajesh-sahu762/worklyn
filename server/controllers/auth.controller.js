const { validateRegister } = require("../validators/auth.validator");
const { registerUser , verifyEmail , resendVerificationOtp, requestPasswordReset, resetPassword, loginUser, refreshAccessToken, logoutUser } = require("../services/auth.service");

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
      "OTP_ATTEMPTS_EXCEEDED",
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
      message: result.emailSent ? "Verification email sent successfully" : "Verification email could not be sent. Please try again shortly.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Resend Verification OTP Error:",
      error
    );

    if (error.message === "Please wait before requesting another verification code") {
      return res.status(429).json({ success: false, message: error.message });
    }

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



const forgotPasswordController = async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: "Enter a valid email address" });
  }
  try {
    await requestPasswordReset({ email });
    return res.status(200).json({
      success: true,
      message: "If an eligible account exists for this email, a password reset link will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", { name: error?.name || "Error" });
    return res.status(500).json({ success: false, message: "Unable to process your request right now" });
  }
};

const resetPasswordController = async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== "string" || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: "A valid reset token and password of 8–128 characters are required" });
  }
  try {
    await resetPassword({ token, password });
    return res.status(200).json({ success: true, message: "Password reset successfully. Please sign in again." });
  } catch (error) {
    if (error.message === "Invalid or expired password reset link") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Reset password error:", { name: error?.name || "Error" });
    return res.status(500).json({ success: false, message: "Unable to reset your password right now" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser({
      email,
      password,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    // Refresh token in HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    const clientErrors = [
      "Invalid email or password",
      "Account has been deleted",
      "Account is deactivated",
      "Please verify your email first",
      "This account does not use password login",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(401).json({
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


const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};


const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    const result = await refreshAccessToken({
      refreshToken,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.status(401).json({ success: false, message: error.message });
}
};

const logout = async (req,res) => {

  try {
    const refreshToken = req.cookies.refreshToken;
    await logoutUser(refreshToken);

    res.clearCookie("refreshToken",{
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      samesite: process.env.NODE_ENV === "production" ?"none" :"lax"
    })

    return res.status(200).json({
      success: true,
      message: "Logged Out Successfully"
    })


  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }

}


module.exports = {
  register,
  verifyEmailController,
  resendVerificationOtpController,
  forgotPasswordController,
  resetPasswordController,
  login,
  getMe,
  refresh,
  logout
};