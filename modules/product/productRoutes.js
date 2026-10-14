const express = require('express');
const router = express.Router();
const productController = require('./productController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');
const { uploadProductImages } = require('../../middleware/uploadMiddleware');

// Public read-only endpoints
router.get('/', (req, res, next) => productController.getProducts(req, res, next));
router.get('/slug/:slug', (req, res, next) => productController.getProductBySlug(req, res, next));
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

// Admin CRUD endpoints (protected)
router.post(
  '/admin',
  verifyToken,
  isAdmin,
  uploadProductImages,
  (req, res, next) => productController.createProduct(req, res, next)
);
router.put(
  '/admin/:id',
  verifyToken,
  isAdmin,
  uploadProductImages,
  (req, res, next) => productController.updateProduct(req, res, next)
);
router.delete(
  '/admin/:id',
  verifyToken,
  isAdmin,
  (req, res, next) => productController.deleteProduct(req, res, next)
);

module.exports = router;