const express = require('express');
const router = express.Router();
const collectionController = require('./collectionController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// Public endpoints
router.get('/', (req, res, next) => collectionController.getCollections(req, res, next));
router.get('/:id', (req, res, next) => collectionController.getCollectionById(req, res, next));

// Admin CRUD endpoints (protected)
router.post('/', verifyToken, isAdmin, (req, res, next) => collectionController.createCollection(req, res, next));
router.put('/:id', verifyToken, isAdmin, (req, res, next) => collectionController.updateCollection(req, res, next));
router.delete('/:id', verifyToken, isAdmin, (req, res, next) => collectionController.deleteCollection(req, res, next));

module.exports = router;
