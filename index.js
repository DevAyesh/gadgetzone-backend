const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Import Modular Routes
const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/user/userRoutes');
const paymentRoutes = require('./modules/payment/paymentRoutes');
const productRoutes = require('./modules/product/productRoutes');
const categoryRoutes = require('./modules/category/categoryRoutes');
const collectionRoutes = require('./modules/collection/collectionRoutes');
const orderRoutes = require('./modules/order/orderRoutes');
const notificationRoutes = require('./modules/notification/notificationRoutes');

// Import Global Middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
// PayHere sends webhook notifications in application/x-www-form-urlencoded format
app.use(express.urlencoded({ extended: true }));

// Mount Domain Microservices Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'GadgetZone Gatekeeper (Auth, User & Payment) API Microservice is running',
    timestamp: new Date().toISOString(),
  });
});

// Error Handling Middleware (must be LAST)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[SERVER RUNNING] GADGETZONE BACKEND RUNNING IN ${(process.env.NODE_ENV || 'DEVELOPMENT').toUpperCase()} MODE ON PORT ${PORT}`);
});
