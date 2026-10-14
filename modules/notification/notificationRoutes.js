const express = require('express');
const router = express.Router();
const notificationController = require('./notificationController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');
const { otpLimiter } = require('../../middleware/rateLimiter');

// Public OTP helper routes
router.post('/verify-otp', (req, res, next) => notificationController.verifyOtp(req, res, next));
router.post('/resend-otp', otpLimiter, (req, res, next) => notificationController.resendOtp(req, res, next));

// Admin routes
router.post('/test', verifyToken, isAdmin, (req, res, next) => notificationController.sendTestEmail(req, res, next));
router.post('/send-custom', verifyToken, isAdmin, (req, res, next) => notificationController.sendCustomNotification(req, res, next));
router.get('/history', verifyToken, isAdmin, (req, res, next) => notificationController.getNotificationHistory(req, res, next));

module.exports = router;
