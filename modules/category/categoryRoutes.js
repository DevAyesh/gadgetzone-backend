const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// Public endpoints
router.get('/', (req, res, next) => categoryController.getCategories(req, res, next));
router.get('/:id', (req, res, next) => categoryController.getCategoryById(req, res, next));

// Admin CRUD endpoints (protected)
router.post('/', verifyToken, isAdmin, (req, res, next) => categoryController.createCategory(req, res, next));
router.put('/:id', verifyToken, isAdmin, (req, res, next) => categoryController.updateCategory(req, res, next));
router.delete('/:id', verifyToken, isAdmin, (req, res, next) => categoryController.deleteCategory(req, res, next));

module.exports = router;
