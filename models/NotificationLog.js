const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      required: true,
      enum: [
        'REGISTER_OTP',
        'LOGIN_OTP',
        'PASSWORD_RESET_OTP',
        'PASSWORD_RESET_SUCCESS',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'PAYMENT_CANCELED',
        'PAYMENT_PENDING',
        'PAYMENT_CHARGEBACK',
        'ORDER_CREATED',
        'ORDER_DELIVERED',
        'ORDER_SHIPPED',
        'ORDER_CANCELLED',
        'GENERIC',
      ],
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['SENT', 'FAILED', 'DEV_MOCKED'],
      default: 'SENT',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationLogSchema.index({ createdAt: -1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;
