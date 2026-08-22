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
}

module.exports = new OrderController();