const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { loginLimiter, otpLimiter } = require('../../middleware/rateLimiter');

// Registration & Email Verification
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/verify-register-otp', (req, res, next) => authController.verifyRegisterOtp(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyRegisterOtp(req, res, next));

// Login & 2FA / Login OTP
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/send-login-otp', otpLimiter, (req, res, next) => authController.sendLoginOtp(req, res, next));
router.post('/verify-login-otp', (req, res, next) => authController.verifyLoginOtp(req, res, next));

// Password Reset Flow
router.post('/forgot-password', otpLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/verify-reset-otp', (req, res, next) => authController.verifyResetOtp(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// General Resend OTP
router.post('/resend-otp', otpLimiter, (req, res, next) => authController.resendOtp(req, res, next));

// OAuth
router.post('/google', loginLimiter, (req, res, next) => authController.googleAuth(req, res, next));

module.exports = router;
