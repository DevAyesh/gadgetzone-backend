/**
 * Data Transfer Objects (DTOs) and Validators for Order Module
 */

const validateCreateOrderInput = (data) => {
  const errors = [];

  if (!Array.isArray(data.orderItems) || data.orderItems.length === 0) {
    errors.push('Order must contain at least one item');
  } else {
    data.orderItems.forEach((item, idx) => {
      if (!item.product) errors.push(`orderItems[${idx}]: product ID is required`);
      if (!item.qty || isNaN(Number(item.qty)) || Number(item.qty) < 1) {
        errors.push(`orderItems[${idx}]: qty must be a number of at least 1`);
      }
    });
  }

  const addr = data.shippingAddress;
  if (!addr || typeof addr !== 'object') {
    errors.push('shippingAddress is required');
  } else {
    if (!addr.address || !String(addr.address).trim()) errors.push('shippingAddress.address is required');
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

const toOrderDTO = (order) => {
  return {
    _id: order._id,
    user: order.user,
    orderItems: order.orderItems.map((item) => ({
      name: item.name,
      qty: item.qty,
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
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

module.exports = {
  validateCreateOrderInput,
  validateUpdateOrderStatusInput,
  toOrderDTO,
};