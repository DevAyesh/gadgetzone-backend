const express = require('express');
const router = express.Router();
const orderController = require('./orderController');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

/**
 * Flexible middleware that authenticates logged-in users via JWT Bearer token
 * or resolves/registers a guest user by customer email during checkout.
 */
const optionalAuthOrGuest = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isRemoved && user.isActive !== false) {
        req.user = user;
        return next();
      }
    } catch {
      // Invalid token, fall through to email check below
    }
  }

  const email = (req.body?.shippingAddress?.email || req.body?.email || '').toLowerCase().trim();
  const name = req.body?.shippingAddress?.name || req.body?.name || 'Customer';

  if (email) {
    try {
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name,
          email,
          role: 'customer',
          isActive: true,
          isEmailVerified: false,
        });
      }
      req.user = user;
      return next();
    } catch {
      // Fall through to verifyToken
    }
  }

  return verifyToken(req, res, next);
};

// Customer routes (supports both POST /api/orders and POST /api/orders/create)
router.post('/', optionalAuthOrGuest, (req, res, next) => orderController.createOrder(req, res, next));
router.post('/create', optionalAuthOrGuest, (req, res, next) => orderController.createOrder(req, res, next));
router.get('/myorders', verifyToken, (req, res, next) => orderController.getMyOrders(req, res, next));

// Admin — dashboard & analytics routes (must come before /admin generic list and /:id)
router.get('/admin/sales/daily', verifyToken, isAdmin, (req, res, next) => orderController.getDailySales(req, res, next));
router.get('/admin/sales/monthly', verifyToken, isAdmin, (req, res, next) => orderController.getMonthlySales(req, res, next));
router.get('/admin/sales/top-products', verifyToken, isAdmin, (req, res, next) => orderController.getTopSellingProducts(req, res, next));
router.get('/admin/metrics', verifyToken, isAdmin, (req, res, next) => orderController.getDashboardMetrics(req, res, next));

// Admin — general order management
router.get('/admin', verifyToken, isAdmin, (req, res, next) => orderController.getAllOrders(req, res, next));
router.put('/:id/pay', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsPaid(req, res, next));
router.put('/:id/ship', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsShipped(req, res, next));
router.put('/:id/deliver', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsDelivered(req, res, next));

// Cancellation and Payment Failure routes
router.post('/:id/payment-failed', optionalAuthOrGuest, (req, res, next) => orderController.markPaymentFailed(req, res, next));
router.put('/:id/cancel', verifyToken, (req, res, next) => orderController.cancelOrder(req, res, next));

// Shared route (owner or admin) — kept last since :id is a wildcard segment
router.get('/:id', verifyToken, (req, res, next) => orderController.getOrderById(req, res, next));

module.exports = router;