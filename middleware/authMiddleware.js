const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../common/dtos/responseDto');

/**
 * Middleware guard to verify JWT Bearer token & check isRemoved/isActive flags
 */
const verifyToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.warn(`[SECURITY WARN] BEARER TOKEN VALID BUT USER ID ${decoded.id} NO LONGER EXISTS. REQUEST: ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP: ${req.ip}`);
        return errorResponse(res, 401, 'User associated with token no longer exists');
      }

      if (user.isRemoved) {
        console.warn(`[SECURITY WARN] ATTEMPT TO ACCESS PROTECTED ROUTE WITH TOKEN FOR DELETED USER ACCOUNT (ID: ${user._id}, EMAIL: ${user.email.toUpperCase()}). REQUEST: ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP: ${req.ip}`);
        return errorResponse(res, 401, 'User account has been deactivated or deleted');
      }

      if (user.isActive === false) {
        console.warn(`[SECURITY WARN] ATTEMPT TO ACCESS PROTECTED ROUTE WITH TOKEN FOR INACTIVE/SUSPENDED USER ACCOUNT (ID: ${user._id}, EMAIL: ${user.email.toUpperCase()}). REQUEST: ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP: ${req.ip}`);
        return errorResponse(res, 401, 'Your account has been deactivated by an administrator');
      }

      req.user = user;
      return next();
    } catch (error) {
      console.warn(`[SECURITY WARN] INVALID OR EXPIRED JWT TOKEN USED FOR ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP ${req.ip}: ${error.message.toUpperCase()}`);
      return errorResponse(res, 401, 'Not authorized, token verification failed');
    }
  }

  if (!token) {
    console.warn(`[SECURITY WARN] MISSING AUTHORIZATION TOKEN FOR PROTECTED ROUTE: ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP ${req.ip}`);
    return errorResponse(res, 401, 'Not authorized, no bearer token provided');
  }
};

/**
 * Middleware guard to check if user has admin privileges
 */
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
    return next();
  }
  console.warn(`[SECURITY ALERT] NON-ADMIN USER (ID: ${req.user?._id}, EMAIL: ${req.user?.email?.toUpperCase()}) ATTEMPTED FORBIDDEN ACCESS TO ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()} FROM IP ${req.ip}`);
  return errorResponse(res, 403, 'Forbidden: Admin access required');
};

module.exports = {
  verifyToken,
  protect: verifyToken,
  isAdmin,
  admin: isAdmin,
};
