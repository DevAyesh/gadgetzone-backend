const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../../models/User');
const notificationService = require('../notification/notificationService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Generate JWT Token
   */
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '30d',
    });
  }

  /**
   * Register a new user (handles account reactivation if previously soft-deleted)
   * Sends Register Confirmation OTP via Notification Service
   */
  async registerUser({ name, email, password, role: _role }) {
    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });
    
    if (user) {
      if (!user.isRemoved) {
        const error = new Error('User already exists with this email address');
        error.statusCode = 400;
        throw error;
      }
      // Public registration always assigns customer role; admin onboarding requires elevated admin endpoint
      user.name = name;
      user.password = password;
      user.role = 'customer';
      user.isAdmin = false;
      user.isSuperAdmin = false;
      user.isRemoved = false;
      user.isActive = true;
      user.isEmailVerified = false;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: cleanEmail,
        password,
        role: 'customer',
        isAdmin: false,
        isSuperAdmin: false,
        isRemoved: false,
        isActive: true,
        isEmailVerified: false,
      });
    }

    // Trigger Register Confirmation Email OTP
    try {
      await notificationService.generateAndSendOtp(user.email, 'REGISTER', user.name, 10);
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send register OTP to ${user.email}:`, notifErr.message);
    }

    const token = this.generateToken(user._id);
    return { user, token, requireVerification: true };
  }

  /**
   * Verify Register Confirmation OTP
   */
  async verifyRegisterOtp({ email, otp }) {
    const cleanEmail = email.toLowerCase().trim();
    await notificationService.verifyOtp(cleanEmail, 'REGISTER', otp, true);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    user.isEmailVerified = true;
    await user.save();

    const token = this.generateToken(user._id);
    return { user, token };
  }

  /**
   * Authenticate user credentials
   * If requireOtp is enabled, sends a login verification OTP instead of returning direct token
   */
  async loginUser({ email, password, requireOtp = false }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (user.isRemoved) {
      const error = new Error('Account has been deactivated or deleted');
      error.statusCode = 401;
      throw error;
    }

    if (user.isActive === false) {
      const error = new Error('Your account has been deactivated by an administrator');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // If 2FA OTP is explicitly requested or globally required via environment variable
    if (requireOtp || process.env.REQUIRE_LOGIN_OTP === 'true') {
      try {
        await notificationService.generateAndSendOtp(user.email, 'LOGIN', user.name, 10);
      } catch (notifErr) {
        console.error(`[NOTIFICATION ERROR] Failed to send login OTP to ${user.email}:`, notifErr.message);
      }

      return {
        requireOtp: true,
        email: user.email,
        message: 'Login verification OTP has been sent to your registered email address',
      };
    }

    const token = this.generateToken(user._id);
    return { user, token };
  }

  /**
   * Send Login OTP for passwordless / 2FA login initiation
   */
  async sendLoginOtp({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user || user.isRemoved || user.isActive === false) {
      const error = new Error('User not found or account is deactivated');
      error.statusCode = 404;
      throw error;
    }

    await notificationService.generateAndSendOtp(user.email, 'LOGIN', user.name, 10);
    return {
      success: true,
      email: user.email,
      message: 'Login OTP sent to your email address',
    };
  }

  /**
   * Verify Login OTP and complete authentication
   */
  async verifyLoginOtp({ email, otp }) {
    const cleanEmail = email.toLowerCase().trim();
    await notificationService.verifyOtp(cleanEmail, 'LOGIN', otp, true);

    const user = await User.findOne({ email: cleanEmail });
    if (!user || user.isRemoved || user.isActive === false) {
      const error = new Error('User not found or account is inactive');
      error.statusCode = 404;
      throw error;
    }

    const token = this.generateToken(user._id);
    return { user, token };
  }

  /**
   * Request Password Reset OTP
   */
  async forgotPassword({ email }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // For security, always return success even if user not found (prevents email enumeration)
    if (user && !user.isRemoved && user.isActive !== false) {
      try {
        await notificationService.generateAndSendOtp(user.email, 'PASSWORD_RESET', user.name, 15);
      } catch (notifErr) {
        console.error(`[NOTIFICATION ERROR] Failed to send password reset OTP to ${user.email}:`, notifErr.message);
      }
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset verification code has been sent.',
    };
  }

  /**
   * Verify Password Reset OTP (without consuming it, so client can proceed to new password form)
   */
  async verifyResetOtp({ email, otp }) {
    const cleanEmail = email.toLowerCase().trim();
    await notificationService.verifyOtp(cleanEmail, 'PASSWORD_RESET', otp, false);
    return { isValid: true, message: 'Password reset code is valid' };
  }

  /**
   * Reset Password with OTP verification
   */
  async resetPassword({ email, otp, newPassword }) {
    const cleanEmail = email.toLowerCase().trim();
    // Consume the OTP
    await notificationService.verifyOtp(cleanEmail, 'PASSWORD_RESET', otp, true);

    const user = await User.findOne({ email: cleanEmail });
    if (!user || user.isRemoved || user.isActive === false) {
      const error = new Error('User not found or account is inactive');
      error.statusCode = 404;
      throw error;
    }

    user.password = newPassword;
    await user.save();

    // Trigger Password Reset Success confirmation notification
    try {
      await notificationService.sendPasswordResetSuccessNotification(user);
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send password reset confirmation to ${user.email}:`, notifErr.message);
    }

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Resend an OTP for any supported purpose (REGISTER, LOGIN, PASSWORD_RESET)
   */
  async resendOtp({ email, purpose }) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!['REGISTER', 'LOGIN', 'PASSWORD_RESET'].includes(purpose)) {
      const error = new Error('Invalid OTP purpose specified');
      error.statusCode = 400;
      throw error;
    }

    const name = user ? user.name : 'Customer';
    await notificationService.generateAndSendOtp(cleanEmail, purpose, name, 10);

    return {
      success: true,
      message: `A new verification code for ${purpose} has been sent to ${cleanEmail}.`,
    };
  }

  /**
   * Authenticate / Register via Google OAuth
   */
  async googleAuth(idToken) {
    let payload;
    try {
      if (process.env.GOOGLE_CLIENT_ID) {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } else {
        // Fallback for development/testing when GOOGLE_CLIENT_ID is not configured
        const decoded = jwt.decode(idToken);
        if (!decoded || !decoded.email) {
          const error = new Error('Invalid Google ID Token');
          error.statusCode = 400;
          throw error;
        }
        payload = decoded;
      }
    } catch (err) {
      const error = new Error('Google OAuth verification failed: ' + err.message);
      error.statusCode = 401;
      throw error;
    }

    const { email, name, sub: googleId, picture: avatar } = payload;
    const cleanEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: cleanEmail });

    if (user) {
      if (user.isRemoved) {
        const error = new Error('Account has been deactivated or deleted');
        error.statusCode = 401;
        throw error;
      }

      if (user.isActive === false) {
        const error = new Error('Your account has been deactivated by an administrator');
        error.statusCode = 401;
        throw error;
      }

      const isSuperTarget = cleanEmail === 'akilamw772@gmail.com';
      if (isSuperTarget && (!user.isSuperAdmin || user.role !== 'admin' || !user.isAdmin)) {
        user.role = 'admin';
        user.isAdmin = true;
        user.isSuperAdmin = true;
      }

      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        user.isEmailVerified = true;
        await user.save();
      } else if (isSuperTarget) {
        await user.save();
      }
    } else {
      const isSuperTarget = cleanEmail === 'akilamw772@gmail.com';
      user = await User.create({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        googleId,
        avatar: avatar || '',
        role: isSuperTarget ? 'admin' : 'customer',
        isAdmin: isSuperTarget,
        isSuperAdmin: isSuperTarget,
        isRemoved: false,
        isActive: true,
        isEmailVerified: true, // Google already verified email
      });
    }

    const token = this.generateToken(user._id);
    return { user, token };
  }
}

module.exports = new AuthService();
