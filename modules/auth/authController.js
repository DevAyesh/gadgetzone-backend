const authService = require('./authService');
const {
  validateRegisterInput,
  validateLoginInput,
  validateGoogleAuthInput,
  validateVerifyRegisterOtpInput,
  validateSendLoginOtpInput,
  validateVerifyLoginOtpInput,
  validateForgotPasswordInput,
  validateVerifyResetOtpInput,
  validateResetPasswordInput,
  validateResendOtpInput,
  toAuthResponseDTO,
} = require('./dtos/authDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register a new user & trigger Register Confirmation OTP
   * @access  Public
   */
  async register(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateRegisterInput(body);
      if (!validation.isValid) {
        console.warn(`[AUTH WARN] REGISTRATION VALIDATION FAILED FROM IP ${req.ip}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.registerUser(body);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] NEW USER REGISTERED SUCCESSFULLY: ${user.email.toUpperCase()} (ID: ${user._id})`);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully. A verification code (OTP) has been sent to your email.',
        data: authData,
        ...authData,
      });
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[AUTH WARN] REGISTRATION FAILED FOR EMAIL '${req.body?.email?.toUpperCase()}': ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/verify-register-otp
   * @desc    Verify Registration OTP and activate email verification status
   * @access  Public
   */
  async verifyRegisterOtp(req, res, next) {
    try {
      const body = req.body || {};
      if (!body.otp && body.code) body.otp = body.code;

      const validation = validateVerifyRegisterOtpInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.verifyRegisterOtp(body);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] EMAIL VERIFIED SUCCESSFULLY FOR USER: ${user.email.toUpperCase()}`);
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: authData,
        ...authData,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/login
   * @desc    Authenticate user & return JWT token (or trigger login OTP if 2FA requested)
   * @access  Public (Rate-limited)
   */
  async login(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateLoginInput(body);
      if (!validation.isValid) {
        console.warn(`[AUTH WARN] LOGIN VALIDATION FAILED FROM IP ${req.ip}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.loginUser(body);

      if (result.requireOtp) {
        console.log(`[AUTH 2FA] LOGIN OTP CHALLENGE INITIATED FOR: ${result.email.toUpperCase()}`);
        return successResponse(res, 200, result.message, { requireOtp: true, email: result.email });
      }

      const authData = toAuthResponseDTO(result.user, result.token);
      console.log(`[AUTH SUCCESS] USER LOGGED IN SUCCESSFULLY: ${result.user.email.toUpperCase()} (ID: ${result.user._id})`);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: authData,
        ...authData,
      });
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[SECURITY WARN] FAILED LOGIN ATTEMPT FOR EMAIL '${req.body?.email?.toUpperCase()}': ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/send-login-otp
   * @desc    Initiate Login OTP (passwordless / 2FA login)
   * @access  Public
   */
  async sendLoginOtp(req, res, next) {
    try {
      const validation = validateSendLoginOtpInput(req.body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.sendLoginOtp(req.body);
      return successResponse(res, 200, result.message, { email: result.email });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/verify-login-otp
   * @desc    Verify Login OTP and issue JWT session
   * @access  Public
   */
  async verifyLoginOtp(req, res, next) {
    try {
      const body = req.body || {};
      if (!body.otp && body.code) body.otp = body.code;

      const validation = validateVerifyLoginOtpInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.verifyLoginOtp(body);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] USER 2FA LOGIN VERIFIED: ${user.email.toUpperCase()} (ID: ${user._id})`);
      return res.status(200).json({
        success: true,
        message: 'Login verified successfully',
        data: authData,
        ...authData,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/forgot-password
   * @desc    Send Password Reset OTP
   * @access  Public
   */
  async forgotPassword(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateForgotPasswordInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.forgotPassword(body);
      return successResponse(res, 200, result.message);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/verify-reset-otp
   * @desc    Verify Password Reset OTP before entering new password
   * @access  Public
   */
  async verifyResetOtp(req, res, next) {
    try {
      const body = req.body || {};
      if (!body.otp && body.code) body.otp = body.code;

      const validation = validateVerifyResetOtpInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.verifyResetOtp(body);
      return successResponse(res, 200, result.message, { isValid: true });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/reset-password
   * @desc    Reset password using verified OTP
   * @access  Public
   */
  async resetPassword(req, res, next) {
    try {
      const body = req.body || {};
      if (!body.otp && body.code) body.otp = body.code;

      const validation = validateResetPasswordInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.resetPassword(body);
      console.log(`[AUTH SUCCESS] PASSWORD RESET COMPLETED FOR EMAIL: ${body.email?.toUpperCase()}`);
      return successResponse(res, 200, result.message);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/resend-otp
   * @desc    Resend an OTP for any purpose (REGISTER, LOGIN, PASSWORD_RESET)
   * @access  Public
   */
  async resendOtp(req, res, next) {
    try {
      const body = req.body || {};
      const validation = validateResendOtpInput(body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const result = await authService.resendOtp(body);
      return successResponse(res, 200, result.message);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/google
   * @desc    Authenticate user via Google OAuth idToken
   * @access  Public
   */
  async googleAuth(req, res, next) {
    try {
      const validation = validateGoogleAuthInput(req.body);
      if (!validation.isValid) {
        console.warn(`[AUTH WARN] GOOGLE AUTH VALIDATION FAILED FROM IP ${req.ip}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.googleAuth(req.body.idToken);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] GOOGLE OAUTH LOGIN SUCCESSFUL FOR EMAIL: ${user.email.toUpperCase()} (ID: ${user._id})`);
      return res.status(200).json({
        success: true,
        message: 'Google Authentication successful',
        data: authData,
        ...authData,
      });
    } catch (error) {
      if (error.statusCode) {
        console.error(`[SECURITY ERROR] GOOGLE OAUTH AUTHENTICATION FAILED FROM IP ${req.ip}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new AuthController();
