const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const notificationService = require('../notification/notificationService');

class OrderService {
  /**
   * [CUSTOMER] Create a new order (checkout).
   * SECURITY: prices are always re-fetched from the DB, never trusted from the client.
   * ERROR-HANDLING: stock is reserved atomically per item; if any item is unavailable
   * mid-checkout, previously-reserved stock is rolled back and a clear error is thrown.
   * NOTIFICATION: dispatches order confirmation email to the customer upon placement.
   */
  async createOrder(userId, { orderItems, shippingAddress, paymentMethod }) {
    const reservedItems = []; // tracks successfully decremented items, for rollback on failure
    const builtItems = [];
    let totalPrice = 0;

    try {
      for (const reqItem of orderItems) {
        const productId = reqItem.product || reqItem.id || reqItem._id;
        const product = await Product.findById(productId);

        if (!product || product.isRemoved) {
          const error = new Error(`Product not found: ${productId}`);
          error.statusCode = 404;
          throw error;
        }

        const qty = Number(reqItem.qty !== undefined ? reqItem.qty : reqItem.quantity);

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

      const normalizedAddress = {
        address: shippingAddress.address || shippingAddress.addressLine1,
        city: shippingAddress.city,
        state: shippingAddress.state || '',
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'LK',
        email: shippingAddress.email || '',
        phone: shippingAddress.phone || '',
        name: shippingAddress.name || '',
      };

      const isPayHere = /^payhere$/i.test(String(paymentMethod || '').trim());

      const order = await Order.create({
        user: userId,
        orderItems: builtItems,
        shippingAddress: normalizedAddress,
        paymentMethod: paymentMethod || 'PayHere',
        totalPrice: Number(totalPrice.toFixed(2)),
        isPaid: false,
        isDelivered: false,
        isShipped: false,
        isCancelled: false,
        paymentResult: isPayHere
          ? { status: 'PENDING_PAYMENT', update_time: new Date().toISOString() }
          : { status: 'NOT_PAID', update_time: new Date().toISOString() },
      });

      // Populate user info for email notification
      await order.populate('user', 'name email');

      // Dispatch Order Created Notification ONLY for non-PayHere orders (e.g. COD, Bank Transfer).
      // For PayHere orders, confirmation email is sent ONLY after successful payment completion.
      if (!isPayHere) {
        try {
          await notificationService.sendOrderCreatedNotification(order);
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send order creation notification for order ${order._id}:`, notifErr.message);
        }
      }

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
    } catch {
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
   * Excludes unpaid/failed PayHere orders so admin only sees real fulfilled/actionable orders.
   */
  async getAllOrders(queryParams = {}) {
    const { isPaid, isDelivered, isShipped, isCancelled, page = 1, limit = 20 } = queryParams;
    const filter = {};

    if (isPaid !== undefined && isPaid !== '') filter.isPaid = String(isPaid) === 'true';
    if (isDelivered !== undefined && isDelivered !== '') filter.isDelivered = String(isDelivered) === 'true';
    if (isShipped !== undefined && isShipped !== '') filter.isShipped = String(isShipped) === 'true';
    if (isCancelled !== undefined && isCancelled !== '') filter.isCancelled = String(isCancelled) === 'true';

    // Critical Requirement: Exclude unpaid/failed PayHere orders from Admin Orders List!
    // Unpaid PayHere orders must stay in customer's My Orders, but not appear in the admin panel.
    const payHereFilter = {
      $or: [
        { paymentMethod: { $not: { $regex: /^payhere$/i } } },
        { isPaid: true },
      ],
    };

    const finalFilter = Object.keys(filter).length > 0
      ? { $and: [payHereFilter, filter] }
      : payHereFilter;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await Order.countDocuments(finalFilter);
    const orders = await Order.find(finalFilter)
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
   * [ADMIN / PAYMENT WEBHOOK] Mark an order as paid and dispatch payment confirmation notification
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
    await updatedOrder.populate('user', 'name email');

    // Send Payment Success Notification
    try {
      await notificationService.sendPaymentSuccessNotification({
        order: updatedOrder,
        paymentResult: updatedOrder.paymentResult,
        paymentAmount: updatedOrder.totalPrice,
        currency: 'LKR',
      });
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send payment confirmation for order ${updatedOrder._id}:`, notifErr.message);
    }

    return updatedOrder;
  }

  /**
   * [ADMIN] Mark an order as shipped and dispatch shipping notification
   */
  async updateOrderToShipped(orderId, { carrier, trackingNumber } = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const isCod = order.paymentMethod?.toLowerCase() === 'cod' || order.paymentMethod?.toLowerCase() === 'cash on delivery';
    if (!order.isPaid && !isCod) {
      const error = new Error('Cannot mark an unpaid order as shipped');
      error.statusCode = 400;
      throw error;
    }

    order.isShipped = true;
    order.shippedAt = Date.now();
    order.trackingInfo = {
      carrier: carrier || 'Pronto Courier',
      trackingNumber: trackingNumber || '',
    };

    const updatedOrder = await order.save();
    await updatedOrder.populate('user', 'name email');

    // Send Order Shipped Notification
    try {
      await notificationService.sendOrderShippedNotification(updatedOrder, { carrier, trackingNumber });
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send shipping notification for order ${updatedOrder._id}:`, notifErr.message);
    }

    return updatedOrder;
  }

  /**
   * [ADMIN] Mark an order as delivered and dispatch delivery notification
   */
  async updateOrderToDelivered(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const isCod = order.paymentMethod?.toLowerCase() === 'cod' || order.paymentMethod?.toLowerCase() === 'cash on delivery';
    if (!order.isPaid && !isCod) {
      const error = new Error('Cannot mark an unpaid order as delivered');
      error.statusCode = 400;
      throw error;
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    if (isCod && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        status: 'COMPLETED',
        method: 'COD',
        receivedAt: new Date().toISOString(),
      };
    }

    const updatedOrder = await order.save();
    await updatedOrder.populate('user', 'name email');

    // Send Order Delivered Notification
    try {
      await notificationService.sendOrderDeliveredNotification(updatedOrder);
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send delivery notification for order ${updatedOrder._id}:`, notifErr.message);
    }

    return updatedOrder;
  }

  /**
   * [CUSTOMER / ADMIN] Cancel order and restock inventory
   */
  async cancelOrder(orderId, { reason } = {}, requestingUser) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const isOwner = order.user.toString() === requestingUser._id.toString();
    const isAdmin = requestingUser.role === 'admin' || requestingUser.isAdmin === true;

    if (!isOwner && !isAdmin) {
      const error = new Error('Not authorized to cancel this order');
      error.statusCode = 403;
      throw error;
    }

    if (order.isCancelled) {
      const error = new Error('Order is already cancelled');
      error.statusCode = 400;
      throw error;
    }

    if (order.isDelivered) {
      const error = new Error('Cannot cancel an order that has already been delivered');
      error.statusCode = 400;
      throw error;
    }

    // Roll back reserved stock if order was not fulfilled
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: item.qty } });
    }

    order.isCancelled = true;
    order.cancelledAt = Date.now();
    order.cancelReason = reason || 'Cancelled upon customer request';

    const updatedOrder = await order.save();
    await updatedOrder.populate('user', 'name email');

    // Send Order Cancelled Notification
    try {
      await notificationService.sendOrderCancelledNotification(updatedOrder, order.cancelReason);
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send cancellation notification for order ${updatedOrder._id}:`, notifErr.message);
    }

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
    const pendingFilter = {
      isPaid: false,
      isCancelled: false,
      paymentMethod: { $not: { $regex: /^payhere$/i } },
    };

    const [totalUsers, pendingOrdersCount, totalPaidOrders, revenueResult] = await Promise.all([
      User.countDocuments({ isRemoved: false }),
      Order.countDocuments(pendingFilter),
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

  /**
   * [CUSTOMER / PAYMENT] Record PayHere payment failure or user dismissal, and dispatch payment failed email
   */
  async markOrderPaymentFailed(orderId, { reason = 'Payment could not be completed', statusCode = '-2' } = {}, requestingUser = null) {
    let order;
    try {
      order = await Order.findById(orderId);
    } catch {
      order = null;
    }

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (requestingUser) {
      const isOwner = order.user && order.user.toString() === requestingUser._id.toString();
      const isAdmin = requestingUser.role === 'admin' || requestingUser.isAdmin === true;
      if (!isOwner && !isAdmin) {
        const error = new Error('Not authorized to update this order');
        error.statusCode = 403;
        throw error;
      }
    }

    // If order was already paid, do not mark as failed
    if (order.isPaid) {
      return order;
    }

    order.paymentResult = {
      id: order._id.toString(),
      status: 'FAILED',
      status_message: reason,
      update_time: new Date().toISOString(),
    };

    const updatedOrder = await order.save();
    await updatedOrder.populate('user', 'name email');

    // Send Payment Failed notification to the customer
    try {
      await notificationService.sendPaymentFailedNotification({
        order: updatedOrder,
        reason,
        statusCode,
      });
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send payment failed notification for order ${updatedOrder._id}:`, notifErr.message);
    }

    return updatedOrder;
  }
}

module.exports = new OrderService();