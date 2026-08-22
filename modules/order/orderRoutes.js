const express = require('express');
const router = express.Router();
const orderController = require('./orderController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// Customer routes
router.post('/create', verifyToken, (req, res, next) => orderController.createOrder(req, res, next));
router.get('/myorders', verifyToken, (req, res, next) => orderController.getMyOrders(req, res, next));

// Admin — dashboard & analytics routes (must come before /admin generic list and /:id)
router.get('/admin/sales/daily', verifyToken, isAdmin, (req, res, next) => orderController.getDailySales(req, res, next));
router.get('/admin/sales/monthly', verifyToken, isAdmin, (req, res, next) => orderController.getMonthlySales(req, res, next));
router.get('/admin/sales/top-products', verifyToken, isAdmin, (req, res, next) => orderController.getTopSellingProducts(req, res, next));
router.get('/admin/metrics', verifyToken, isAdmin, (req, res, next) => orderController.getDashboardMetrics(req, res, next));

// Admin — general order management
router.get('/admin', verifyToken, isAdmin, (req, res, next) => orderController.getAllOrders(req, res, next));
router.put('/:id/pay', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsPaid(req, res, next));
router.put('/:id/deliver', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsDelivered(req, res, next));

// Shared route (owner or admin) — kept last since :id is a wildcard segment
router.get('/:id', verifyToken, (req, res, next) => orderController.getOrderById(req, res, next));

module.exports = router;