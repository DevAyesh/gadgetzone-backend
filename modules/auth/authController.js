const authService = require('./authService');
const {
  validateRegisterInput,
  validateLoginInput,
  validateGoogleAuthInput,
  toAuthResponseDTO,
} = require('./dtos/authDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class AuthController {
  /**
   * @route   POST /api/auth/register
   * @desc    Register a new user
   * @access  Public
   */
  async register(req, res, next) {
    try {
      const validation = validateRegisterInput(req.body);
      if (!validation.isValid) {
        console.warn(`[AUTH WARN] REGISTRATION VALIDATION FAILED FROM IP ${req.ip}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.registerUser(req.body);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] NEW USER REGISTERED SUCCESSFULLY: ${user.email.toUpperCase()} (ROLE: ${user.role.toUpperCase()}, ID: ${user._id})`);
      return successResponse(res, 201, 'User registered successfully', authData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[AUTH WARN] REGISTRATION FAILED FOR EMAIL '${req.body.email?.toUpperCase()}': ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/auth/login
   * @desc    Authenticate user & return JWT token
   * @access  Public (Rate-limited)
   */
  async login(req, res, next) {
    try {
      const validation = validateLoginInput(req.body);
      if (!validation.isValid) {
        console.warn(`[AUTH WARN] LOGIN VALIDATION FAILED FROM IP ${req.ip}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { user, token } = await authService.loginUser(req.body);
      const authData = toAuthResponseDTO(user, token);

      console.log(`[AUTH SUCCESS] USER LOGGED IN SUCCESSFULLY: ${user.email.toUpperCase()} (ID: ${user._id}, IP: ${req.ip})`);
      return successResponse(res, 200, 'Login successful', authData);
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[SECURITY WARN] FAILED LOGIN ATTEMPT FOR EMAIL '${req.body.email?.toUpperCase()}' FROM IP ${req.ip}: ${error.message.toUpperCase()}`);
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
      return successResponse(res, 200, 'Google Authentication successful', authData);
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
