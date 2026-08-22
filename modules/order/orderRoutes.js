const express = require('express');
const router = express.Router();
const orderController = require('./orderController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// Customer routes (must come before /:id to avoid route collisions)
router.post('/create', verifyToken, (req, res, next) => orderController.createOrder(req, res, next));
router.get('/myorders', verifyToken, (req, res, next) => orderController.getMyOrders(req, res, next));

// Admin routes
router.get('/admin', verifyToken, isAdmin, (req, res, next) => orderController.getAllOrders(req, res, next));
router.put('/:id/pay', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsPaid(req, res, next));
router.put('/:id/deliver', verifyToken, isAdmin, (req, res, next) => orderController.markOrderAsDelivered(req, res, next));

// Shared route (owner or admin) — kept last since :id is a wildcard segment
router.get('/:id', verifyToken, (req, res, next) => orderController.getOrderById(req, res, next));

module.exports = router;