const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for Login and Auth Sensitive Endpoints
 * Limits each IP to 5 requests per 15-minute window
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per 15 minutes
  handler: (req, res /*, next */) => {
    console.warn(`[SECURITY ALERT] RATE LIMIT EXCEEDED FOR IP: ${req.ip} ON ROUTE: ${req.originalUrl.toUpperCase()}`);
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter };
