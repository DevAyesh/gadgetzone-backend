const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { verifyToken, isAdmin } = require('../../middleware/authMiddleware');

// User Self-Service Profile Routes (Private)
router.get('/profile', verifyToken, (req, res, next) => userController.getProfile(req, res, next));
router.put('/profile', verifyToken, (req, res, next) => userController.updateProfile(req, res, next));
router.delete('/profile', verifyToken, (req, res, next) => userController.deleteProfile(req, res, next));

// Admin User Management Routes (Private / Admin Only)
router.get('/', verifyToken, isAdmin, (req, res, next) => userController.getAllUsers(req, res, next));
router.post('/admin', verifyToken, isAdmin, (req, res, next) => userController.createAdmin(req, res, next));
router.get('/:id', verifyToken, isAdmin, (req, res, next) => userController.getUserById(req, res, next));
router.put('/:id/status', verifyToken, isAdmin, (req, res, next) => userController.updateUserStatus(req, res, next));
router.put('/:id/role', verifyToken, isAdmin, (req, res, next) => userController.updateUserRole(req, res, next));
router.delete('/:id', verifyToken, isAdmin, (req, res, next) => userController.deleteUserByAdmin(req, res, next));
router.put('/:id/restore', verifyToken, isAdmin, (req, res, next) => userController.restoreUserByAdmin(req, res, next));

module.exports = router;
