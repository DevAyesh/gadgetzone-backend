/**
 * Data Transfer Objects (DTOs) and Validators for Order Module
 */

const validateCreateOrderInput = (data = {}) => {
  const errors = [];

  if (!Array.isArray(data.orderItems) || data.orderItems.length === 0) {
    errors.push('Order must contain at least one item');
  } else {
    data.orderItems.forEach((item, idx) => {
      const productId = item.product || item.id || item._id;
      const qty = item.qty !== undefined ? item.qty : item.quantity;
      if (!productId) errors.push(`orderItems[${idx}]: product ID is required`);
      if (qty === undefined || isNaN(Number(qty)) || Number(qty) < 1) {
        errors.push(`orderItems[${idx}]: qty must be a number of at least 1`);
      }
    });
  }

  const addr = data.shippingAddress;
  if (!addr || typeof addr !== 'object') {
    errors.push('shippingAddress is required');
  } else {
    const addressStr = addr.address || addr.addressLine1;
    if (!addressStr || !String(addressStr).trim()) errors.push('shippingAddress.address is required');
    if (!addr.city || !String(addr.city).trim()) errors.push('shippingAddress.city is required');
    if (!addr.postalCode || !String(addr.postalCode).trim()) errors.push('shippingAddress.postalCode is required');
    if (!addr.country || !String(addr.country).trim()) errors.push('shippingAddress.country is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateUpdateOrderStatusInput = (data = {}) => {
  const errors = [];
  if (data.isPaid !== undefined && typeof data.isPaid !== 'boolean') {
    errors.push('isPaid must be a boolean');
  }
  if (data.isDelivered !== undefined && typeof data.isDelivered !== 'boolean') {
    errors.push('isDelivered must be a boolean');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateShipOrderInput = (_data = {}) => {
  return {
    isValid: true,
    errors: [],
  };
};

const validateCancelOrderInput = (_data = {}) => {
  return {
    isValid: true,
    errors: [],
  };
};

const toOrderDTO = (order) => {
  if (!order) return null;
  return {
    _id: order._id,
    id: order._id ? order._id.toString() : '',
    orderNumber: `ORD-${order._id}`,
    user: order.user,
    orderItems: (order.orderItems || []).map((item) => ({
      name: item.name,
      qty: item.qty !== undefined ? item.qty : item.quantity,
      imageUrl: item.imageUrl,
      price: item.price,
      product: item.product,
    })),
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    paymentResult: order.paymentResult,
    totalPrice: order.totalPrice,
    isPaid: order.isPaid,
    paidAt: order.paidAt,
    isDelivered: order.isDelivered,
    deliveredAt: order.deliveredAt,
    isShipped: order.isShipped || false,
    shippedAt: order.shippedAt || null,
    isCancelled: order.isCancelled || false,
    cancelledAt: order.cancelledAt || null,
    cancelReason: order.cancelReason || '',
    trackingInfo: order.trackingInfo || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

module.exports = {
  validateCreateOrderInput,
  validateUpdateOrderStatusInput,
  validateShipOrderInput,
  validateCancelOrderInput,
  toOrderDTO,
};