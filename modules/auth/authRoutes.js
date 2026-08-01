const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { loginLimiter } = require('../../middleware/rateLimiter');

// Public Auth Endpoints
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/google', (req, res, next) => authController.googleAuth(req, res, next));

module.exports = router;
