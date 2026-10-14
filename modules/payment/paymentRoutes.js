const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');


const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isRemoved && user.isActive !== false) {
        req.user = user;
      }
    } catch {
      // Ignore token verification failure for optional auth (e.g. guest or expired token)
    }
  }
  next();
};

// Generate MD5 hash for PayHere payment checkout (Supports authenticated and guest checkout)
router.post('/hash', optionalAuth, (req, res, next) => paymentController.generateHash(req, res, next));

// Confirm payment completion (Supports client-side PayHere onCompleted callback and guest checkout)
router.post('/confirm', optionalAuth, (req, res, next) => paymentController.confirmPayment(req, res, next));

// PayHere Webhook / Callback endpoint (Public)
router.post('/notify', (req, res, next) => paymentController.handleWebhook(req, res, next));

module.exports = router;


