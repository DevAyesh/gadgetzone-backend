const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        imageUrl: { type: String, default:" " },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: '' },
      postalCode: { type: String, required: true },
      country: { type: String, required: true, default: 'LK' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      name: { type: String, default: '' },
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'PayHere',
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      payhere_payment_id: { type: String },
      status_message: { type: String },
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    isShipped: {
      type: Boolean,
      default: false,
    },
    shippedAt: {
      type: Date,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      default: '',
    },
    trackingInfo: {
      carrier: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
