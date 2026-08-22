const orderService = require('./orderService');
const {
  validateCreateOrderInput,
  validateUpdateOrderStatusInput,
  toOrderDTO,
} = require('./dtos/orderDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class OrderController {
  /**
   * @route   POST /api/orders/create
   * @desc    Create a new order (checkout)
   * @access  Private
   */
  async createOrder(req, res, next) {
    try {
      const validation = validateCreateOrderInput(req.body);
      if (!validation.isValid) {
        console.warn(`[ORDER WARN] CHECKOUT VALIDATION FAILED FOR USER ID ${req.user._id}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const order = await orderService.createOrder(req.user._id, req.body);
      console.log(`[ORDER SUCCESS] USER '${req.user.email.toUpperCase()}' CREATED ORDER (ID: ${order._id}, TOTAL: ${order.totalPrice})`);
      return successResponse(res, 201, 'Order created successfully', toOrderDTO(order));
    } catch (error) {
      if (error.statusCode) {
        console.warn(`[ORDER WARN] CHECKOUT FAILED FOR USER ID ${req.user._id}: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/myorders
   * @desc    Get logged-in user's own order history
   * @access  Private
   */
  async getMyOrders(req, res, next) {
    try {
      const { orders, pagination } = await orderService.getMyOrders(req.user._id, req.query);
      const ordersDtoList = orders.map(toOrderDTO);
      return successResponse(res, 200, 'Order history fetched successfully', {
        orders: ordersDtoList,
        pagination,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/:id
   * @desc    Get a single order by ID (owner or admin)
   * @access  Private
   */
  async getOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id, req.user);
      return successResponse(res, 200, 'Order fetched successfully', toOrderDTO(order));
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/admin
   * @desc    Get & filter all orders
   * @access  Private/Admin
   */
  async getAllOrders(req, res, next) {
    try {
      const { orders, pagination } = await orderService.getAllOrders(req.query);
      const ordersDtoList = orders.map(toOrderDTO);
      return successResponse(res, 200, 'Orders fetched successfully', {
        orders: ordersDtoList,
        pagination,
      });
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/orders/:id/pay
   * @desc    Mark an order as paid (admin manual override; PayHere webhook uses paymentService directly)
   * @access  Private/Admin
   */
  async markOrderAsPaid(req, res, next) {
    try {
      const order = await orderService.updateOrderToPaid(req.params.id, (req.body && req.body.paymentResult) || {});
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' MARKED ORDER ${order._id} AS PAID`);
      return successResponse(res, 200, 'Order marked as paid', toOrderDTO(order));
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   PUT /api/orders/:id/deliver
   * @desc    Mark an order as delivered
   * @access  Private/Admin
   */
  async markOrderAsDelivered(req, res, next) {
    try {
      const validation = validateUpdateOrderStatusInput(req.body || {});
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const order = await orderService.updateOrderToDelivered(req.params.id);
      console.log(`[ADMIN SUCCESS] ADMIN '${req.user.email.toUpperCase()}' MARKED ORDER ${order._id} AS DELIVERED`);
      return successResponse(res, 200, 'Order marked as delivered', toOrderDTO(order));
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
  /**
    * @route   GET /api/orders/admin/sales/daily
    * @desc    Daily revenue aggregation (paid orders only)
    * @access  Private/Admin
    */
  async getDailySales(req, res, next) {
    try {
      const days = req.query.days || 30;
      const data = await orderService.getDailySales(days);
      return successResponse(res, 200, 'Daily sales data fetched successfully', data);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/admin/sales/monthly
   * @desc    Monthly revenue aggregation (paid orders only)
   * @access  Private/Admin
   */
  async getMonthlySales(req, res, next) {
    try {
      const months = req.query.months || 12;
      const data = await orderService.getMonthlySales(months);
      return successResponse(res, 200, 'Monthly sales data fetched successfully', data);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/admin/sales/top-products
   * @desc    Top-selling products by quantity (paid orders only)
   * @access  Private/Admin
   */
  async getTopSellingProducts(req, res, next) {
    try {
      const limit = req.query.limit || 10;
      const data = await orderService.getTopSellingProducts(limit);
      return successResponse(res, 200, 'Top selling products fetched successfully', data);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/orders/admin/metrics
   * @desc    Dashboard summary metrics (total users, pending orders, revenue)
   * @access  Private/Admin
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const data = await orderService.getDashboardMetrics();
      return successResponse(res, 200, 'Dashboard metrics fetched successfully', data);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new OrderController();