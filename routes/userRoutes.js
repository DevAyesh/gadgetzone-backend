const express = require('express');
const router = express.Router();
const userModuleRoutes = require('../modules/user/userRoutes');
const authModuleRoutes = require('../modules/auth/authRoutes');

// Mount Auth routes on legacy userRoutes for backwards compatibility (/api/users/register, /api/users/login)
router.use('/', authModuleRoutes);
router.use('/', userModuleRoutes);

module.exports = router;
