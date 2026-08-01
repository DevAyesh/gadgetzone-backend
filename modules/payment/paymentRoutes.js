const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');
const { verifyToken } = require('../../middleware/authMiddleware');

// Generate MD5 hash for PayHere payment checkout (Protected)
router.post('/hash', verifyToken, (req, res, next) => paymentController.generateHash(req, res, next));

// PayHere Webhook / Callback endpoint (Public)
router.post('/notify', (req, res, next) => paymentController.handleWebhook(req, res, next));

module.exports = router;
