const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../../models/User');

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
   */
  async registerUser({ name, email, password, role }) {
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      if (!user.isRemoved) {
        const error = new Error('User already exists with this email address');
        error.statusCode = 400;
        throw error;
      }
      // If user was previously soft deleted (isRemoved === true), reactivate the account
      user.name = name;
      user.password = password;
      user.role = role === 'admin' ? 'admin' : 'customer';
      user.isRemoved = false;
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: role === 'admin' ? 'admin' : 'customer',
        isRemoved: false,
        isActive: true,
      });
    }

    const token = this.generateToken(user._id);
    return { user, token };
  }

  /**
   * Authenticate user credentials
   */
  async loginUser({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() });
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

    const token = this.generateToken(user._id);
    return { user, token };
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

    let user = await User.findOne({ email: email.toLowerCase() });

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

      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar && !user.avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: avatar || '',
        role: 'customer',
        isRemoved: false,
        isActive: true,
      });
    }

    const token = this.generateToken(user._id);
    return { user, token };
  }
}

module.exports = new AuthService();
