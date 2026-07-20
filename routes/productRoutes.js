const express = require('express');
const router = express.Router();
const { getProducts, getProductById } = require('../controllers/productController');

// Route to get all products
router.get('/', getProducts);

// Route to get a specific product by ID
router.get('/:id', getProductById);

module.exports = router;
