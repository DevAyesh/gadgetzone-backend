const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

class OrderService {
  /**
   * [CUSTOMER] Create a new order (checkout).
   * SECURITY: prices are always re-fetched from the DB, never trusted from the client.
   * ERROR-HANDLING: stock is reserved atomically per item; if any item is unavailable
   * mid-checkout, previously-reserved stock is rolled back and a clear error is thrown.
   */
  async createOrder(userId, { orderItems, shippingAddress, paymentMethod }) {
    const reservedItems = []; // tracks successfully decremented items, for rollback on failure
    const builtItems = [];
    let totalPrice = 0;

    try {
      for (const reqItem of orderItems) {
        const product = await Product.findById(reqItem.product);

        if (!product || product.isRemoved) {
          const error = new Error(`Product not found: ${reqItem.product}`);
          error.statusCode = 404;
          throw error;
        }

        const qty = Number(reqItem.qty);

        // Atomic stock reservation: only succeeds if enough stock is still available
        // at the moment of decrement, preventing overselling under concurrent checkouts.
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: product._id, countInStock: { $gte: qty } },
          { $inc: { countInStock: -qty } },
          { new: true }
        );

        if (!updatedProduct) {
          const error = new Error(`"${product.name}" is out of stock or has insufficient quantity available`);
          error.statusCode = 409;
          throw error;
        }

        reservedItems.push({ productId: product._id, qty });

        // Price and name/image are snapshotted from the DB at time of purchase —
        // never trust a price sent from the client.
        builtItems.push({
          name: product.name,
          qty,
          imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
          price: product.price,
          product: product._id,
        });

        totalPrice += product.price * qty;
      }

      const order = await Order.create({
        user: userId,
        orderItems: builtItems,
        shippingAddress,
        paymentMethod: paymentMethod || 'PayHere',
        totalPrice: Number(totalPrice.toFixed(2)),
        isPaid: false,
        isDelivered: false,
      });

      return order;
    } catch (error) {
      // Roll back any stock already reserved before the failure occurred
      for (const item of reservedItems) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { countInStock: item.qty } });
      }
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  }

  /**
   * [CUSTOMER/ADMIN] Fetch a single order by ID.
   * Customers may only view their own orders; admins may view any.
   */
  async getOrderById(orderId, requestingUser) {
    let order;
    try {
      order = await Order.findById(orderId).populate('user', 'name email');
    } catch (e) {
      order = null;
    }

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = order.user._id.toString() === requestingUser._id.toString();
    const isAdmin = requestingUser.role === 'admin' || requestingUser.isAdmin === true;

    if (!isOwner && !isAdmin) {
      const error = new Error('Not authorized to view this order');
      error.statusCode = 403;
      throw error;
    }

    return order;
  }

  /**
   * [CUSTOMER] Fetch the logged-in user's own past orders, paginated
   */
  async getMyOrders(userId, queryParams = {}) {
    const { page = 1, limit = 20 } = queryParams;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter = { user: userId };
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * [ADMIN] Fetch & filter all orders, paginated
   */
  async getAllOrders(queryParams = {}) {
    const { isPaid, isDelivered, page = 1, limit = 20 } = queryParams;
    const filter = {};

    if (isPaid !== undefined && isPaid !== '') filter.isPaid = String(isPaid) === 'true';
    if (isDelivered !== undefined && isDelivered !== '') filter.isDelivered = String(isDelivered) === 'true';

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * [ADMIN / PAYMENT WEBHOOK] Mark an order as paid
   */
  async updateOrderToPaid(orderId, paymentResult = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    if (Object.keys(paymentResult).length > 0) {
      order.paymentResult = paymentResult;
    }

    const updatedOrder = await order.save();
    return updatedOrder;
  }

  /**
   * [ADMIN] Mark an order as delivered
   */
  async updateOrderToDelivered(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (!order.isPaid) {
      const error = new Error('Cannot mark an unpaid order as delivered');
      error.statusCode = 400;
      throw error;
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    return updatedOrder;
  }
  
  async getDailySales(days = 30) {
    const daysNum = Math.max(1, Number(days) || 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const results = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          paidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          totalRevenue: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
        },
      },
    ]);

    return results;
  }

  /**
   * [ADMIN] Monthly revenue aggregation for paid orders only, over the last N months
   */
  async getMonthlySales(months = 12) {
    const monthsNum = Math.max(1, Number(months) || 12);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const results = await Order.aggregate([
      {
        $match: {
          isPaid: true,
          paidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
          totalRevenue: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
        },
      },
    ]);

    return results;
  }

  /**
   * [ADMIN] Top-selling products by quantity sold, from paid orders only
   */
  async getTopSellingProducts(limit = 10) {
    const limitNum = Math.max(1, Number(limit) || 10);

    const results = await Order.aggregate([
      { $match: { isPaid: true } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.product',
          name: { $first: '$orderItems.name' },
          totalQtySold: { $sum: '$orderItems.qty' },
          totalRevenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } },
        },
      },
      { $sort: { totalQtySold: -1 } },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          totalQtySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
        },
      },
    ]);

    return results;
  }

  /**
   * [ADMIN] Dashboard summary metrics: total users, pending orders, total revenue
   */
  async getDashboardMetrics() {
    const [totalUsers, pendingOrdersCount, totalPaidOrders, revenueResult] = await Promise.all([
      User.countDocuments({ isRemoved: false }),
      Order.countDocuments({ isPaid: false }),
      Order.countDocuments({ isPaid: true }),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    const totalRevenue = revenueResult.length > 0 ? Number(revenueResult[0].total.toFixed(2)) : 0;

    return {
      totalUsers,
      pendingOrdersCount,
      totalPaidOrders,
      totalRevenue,
    };
  }

}

module.exports = new OrderService();