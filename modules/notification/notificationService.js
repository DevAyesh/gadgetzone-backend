const crypto = require('crypto');
const mongoose = require('mongoose');
const sgMail = require('@sendgrid/mail');
const sendgridConfig = require('../../config/sendgrid');
const Otp = require('../../models/Otp');
const NotificationLog = require('../../models/NotificationLog');
const templates = require('./notificationTemplates');

class NotificationService {
  constructor() {
    if (sendgridConfig.isConfigured) {
      sgMail.setApiKey(sendgridConfig.apiKey);
      console.log(`[NOTIFICATION SERVICE] SendGrid configured with sender: ${sendgridConfig.fromEmail}`);
    } else {
      console.log('[NOTIFICATION SERVICE] SendGrid API Key not configured or placeholder. Running in Mock/Development logging mode.');
    }
  }

  /**
   * Safely write notification audit log if database is connected
   */
  async logNotification(data) {
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await NotificationLog.create(data);
      }
    } catch (err) {
      console.warn('[NOTIFICATION LOG WARN] Could not write notification log:', err.message);
    }
  }

  /**
   * Cryptographically secure 6-digit numeric OTP generator
   */
  generateNumericOtp(length = 6) {
    if (length === 6) {
      return String(crypto.randomInt(100000, 1000000));
    }
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    return String(crypto.randomInt(min, max));
  }

  /**
   * Cryptographic SHA-256 hash for OTP storage
   */
  hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  /**
   * Helper to check if SendGrid is configured
   */
  isSendGridConfigured() {
    const key = (process.env.SENDGRID_API_KEY || sendgridConfig.apiKey || '').replace(/Copied!$/i, '').trim();
    return Boolean(key && (key.startsWith('SG.') || key.length > 20));
  }

  /**
   * Internal sender: dispatches email via SendGrid or dev logger
   */
  async sendEmail({ to, toName = '', subject, html, text = '', type = 'GENERIC', metadata = {} }) {
    const recipientEmail = String(to).toLowerCase().trim();

    // Check if SendGrid is properly configured dynamically
    if (this.isSendGridConfigured()) {
      try {
        const apiKey = (process.env.SENDGRID_API_KEY || sendgridConfig.apiKey || '').replace(/Copied!$/i, '').trim();
        sgMail.setApiKey(apiKey);

        const fromEmail = (process.env.SENDGRID_FROM_EMAIL || sendgridConfig.fromEmail || 'noreply@gadgetzone.lk').trim();
        const fromName = (process.env.SENDGRID_FROM_NAME || sendgridConfig.fromName || 'GadgetZone').trim();

        const msg = {
          to: recipientEmail,
          from: {
            email: fromEmail,
            name: fromName,
          },
          subject,
          html,
          text: text || subject,
        };

        const [response] = await sgMail.send(msg);
        console.log(`[SENDGRID SUCCESS] Email '${type}' sent to ${recipientEmail} (Status: ${response.statusCode})`);

        await this.logNotification({
          recipientEmail,
          recipientName: toName,
          type,
          subject,
          status: 'SENT',
          metadata: { ...metadata, statusCode: response.statusCode },
        });

        return { success: true, status: 'SENT', type };
      } catch (error) {
        console.error(`[SENDGRID ERROR] Failed to send '${type}' email to ${recipientEmail}:`, error.message);
        if (error.response && error.response.body) {
          console.error('[SENDGRID ERROR BODY]:', JSON.stringify(error.response.body));
        }

        await this.logNotification({
          recipientEmail,
          recipientName: toName,
          type,
          subject,
          status: 'FAILED',
          metadata,
          error: error.message,
        });

        // Do not crash primary business operations if email delivery encounters a 3rd party outage
        return { success: false, status: 'FAILED', error: error.message };
      }
    } else {
      // Development / Mock Logging Mode
      console.log('------------------------------------------------------------');
      console.log(`[NOTIFICATION MOCK/DEV] TYPE: ${type}`);
      console.log(`TO: ${recipientEmail} (${toName})`);
      console.log(`SUBJECT: ${subject}`);
      if (metadata && metadata.otp) {
        console.log(`>>> OTP CODE: ${metadata.otp} <<<`);
      }
      console.log('------------------------------------------------------------');

      await this.logNotification({
        recipientEmail,
        recipientName: toName,
        type,
        subject,
        status: 'DEV_MOCKED',
        metadata,
      });

      return { success: true, status: 'DEV_MOCKED', type };
    }
  }

  /**
   * Generate, store, and dispatch an OTP for a given purpose
   */
  async generateAndSendOtp(email, purpose, name = '', expiresInMinutes = 10) {
    const recipientEmail = email.toLowerCase().trim();

    if (!['REGISTER', 'LOGIN', 'PASSWORD_RESET'].includes(purpose)) {
      const error = new Error(`Unsupported OTP purpose: ${purpose}`);
      error.statusCode = 400;
      throw error;
    }

    // Invalidate any previously unconsumed OTPs for this recipient and purpose
    await Otp.updateMany(
      { email: recipientEmail, purpose, isUsed: false },
      { $set: { isUsed: true } }
    );

    const otp = this.generateNumericOtp(6);
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await Otp.create({
      email: recipientEmail,
      otpHash,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt,
    });

    let rendered;
    let type;

    switch (purpose) {
      case 'REGISTER':
        rendered = templates.renderRegisterOtpEmail({ name, otp, expiresInMinutes });
        type = 'REGISTER_OTP';
        break;
      case 'LOGIN':
        rendered = templates.renderLoginOtpEmail({ name, otp, expiresInMinutes });
        type = 'LOGIN_OTP';
        break;
      case 'PASSWORD_RESET':
        rendered = templates.renderPasswordResetOtpEmail({ name, otp, expiresInMinutes });
        type = 'PASSWORD_RESET_OTP';
        break;
      default: {
        const error = new Error(`Unsupported OTP purpose: ${purpose}`);
        error.statusCode = 400;
        throw error;
      }
    }

    await this.sendEmail({
      to: recipientEmail,
      toName: name,
      subject: rendered.subject,
      html: rendered.html,
      type,
      metadata: { otp, purpose, expiresAt },
    });

    return { otp, expiresAt };
  }

  /**
   * Verify an OTP submitted by the user
   */
  async verifyOtp(email, purpose, candidateOtp, markAsUsed = true) {
    const recipientEmail = String(email).toLowerCase().trim();
    const cleanOtp = String(candidateOtp).trim();

    if (!cleanOtp) {
      const error = new Error('Verification code is required');
      error.statusCode = 400;
      throw error;
    }

    if (!['REGISTER', 'LOGIN', 'PASSWORD_RESET'].includes(purpose)) {
      const error = new Error(`Invalid OTP purpose: ${purpose}`);
      error.statusCode = 400;
      throw error;
    }

    const otpDoc = await Otp.findOne({
      email: recipientEmail,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      const error = new Error('Invalid or expired verification code. Please request a new one.');
      error.statusCode = 400;
      throw error;
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      const error = new Error('Too many failed attempts. This code has been invalidated. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    const candidateHash = this.hashOtp(cleanOtp);
    if (candidateHash !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        otpDoc.isUsed = true;
      }
      await otpDoc.save();
      const remaining = Math.max(0, otpDoc.maxAttempts - otpDoc.attempts);
      const error = new Error(
        remaining === 0
          ? 'Too many failed attempts. This code has been invalidated. Please request a new code.'
          : `Incorrect verification code. ${remaining} attempt(s) remaining.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (markAsUsed) {
      otpDoc.isUsed = true;
      await otpDoc.save();
    }

    return { success: true, email: recipientEmail, purpose };
  }

  // -------------------------------------------------------------
  // Specific Domain Microservice Trigger Notifications
  // -------------------------------------------------------------

  /**
   * Send Password Reset Success Notification
   */
  async sendPasswordResetSuccessNotification(user) {
    if (!user || !user.email) return;
    const rendered = templates.renderPasswordResetSuccessEmail({ name: user.name });
    return await this.sendEmail({
      to: user.email,
      toName: user.name,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PASSWORD_RESET_SUCCESS',
      metadata: { userId: user._id },
    });
  }

  /**
   * Helper to resolve customer recipient email and name from an order
   */
  async resolveOrderRecipient(order) {
    if (!order) return { email: '', name: 'Customer' };

    let email = '';
    let name = '';

    // 1. Check populated user object
    if (order.user && typeof order.user === 'object' && order.user.email) {
      email = order.user.email;
      name = order.user.name || 'Customer';
    }

    // 2. Check shippingAddress
    if (!email && order.shippingAddress && order.shippingAddress.email) {
      email = order.shippingAddress.email;
      name = order.shippingAddress.name || name || 'Customer';
    }

    // 3. Fallback: query database if order.user is an ObjectId
    if (!email && order.user && (mongoose.connection && mongoose.connection.readyState === 1)) {
      try {
        const User = require('../../models/User');
        const userDoc = await User.findById(order.user).select('name email');
        if (userDoc) {
          email = userDoc.email;
          name = userDoc.name || 'Customer';
        }
      } catch (err) {
        console.warn('[NOTIFICATION WARN] Could not query user for order recipient:', err.message);
      }
    }

    return {
      email: String(email).toLowerCase().trim(),
      name: name || 'Customer',
    };
  }

  /**
   * Send Payment Success Notification
   */
  async sendPaymentSuccessNotification({ order, paymentResult = {}, paymentAmount, currency = 'LKR' }) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) {
      console.warn(`[NOTIFICATION WARN] Cannot send payment success email for order ${order._id}: No recipient email found.`);
      return;
    }

    const rendered = templates.renderPaymentSuccessEmail({
      customerName: recipientName,
      orderId: order._id,
      paymentId: paymentResult.payhere_payment_id || paymentResult.id || 'N/A',
      amount: paymentAmount || order.totalPrice,
      currency,
      paymentMethod: order.paymentMethod || 'PayHere',
      orderItems: order.orderItems || [],
      shippingAddress: order.shippingAddress,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PAYMENT_SUCCESS',
      metadata: { orderId: order._id, amount: paymentAmount || order.totalPrice, paymentResult },
    });
  }

  /**
   * Send Payment Failed Notification
   */
  async sendPaymentFailedNotification({ order, reason = 'Payment declined by issuer', statusCode = '-2' }) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) {
      console.warn(`[NOTIFICATION WARN] Cannot send payment failed email for order ${order._id}: No recipient email found.`);
      return;
    }

    const rendered = templates.renderPaymentFailedEmail({
      customerName: recipientName,
      orderId: order._id,
      amount: order.totalPrice,
      currency: 'LKR',
      reason,
      statusCode,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PAYMENT_FAILED',
      metadata: { orderId: order._id, reason, statusCode },
    });
  }

  /**
   * Send Payment Canceled Notification
   */
  async sendPaymentCanceledNotification({ order, reason = 'Payment session canceled by user' }) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderPaymentCanceledEmail({
      customerName: recipientName,
      orderId: order._id,
      reason,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PAYMENT_CANCELED',
      metadata: { orderId: order._id, reason },
    });
  }

  /**
   * Send Payment Pending Notification
   */
  async sendPaymentPendingNotification({ order }) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderPaymentPendingEmail({
      customerName: recipientName,
      orderId: order._id,
      amount: order.totalPrice,
      currency: 'LKR',
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PAYMENT_PENDING',
      metadata: { orderId: order._id },
    });
  }

  /**
   * Send Payment Chargeback Alert
   */
  async sendPaymentChargebackNotification({ order }) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderPaymentChargebackEmail({
      customerName: recipientName,
      orderId: order._id,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'PAYMENT_CHARGEBACK',
      metadata: { orderId: order._id },
    });
  }

  /**
   * Send Order Created Notification
   */
  async sendOrderCreatedNotification(order) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) {
      console.warn(`[NOTIFICATION WARN] Cannot send order created notification for order ${order._id}: No email on user.`);
      return;
    }

    const rendered = templates.renderOrderCreatedEmail({
      customerName: recipientName,
      orderId: order._id,
      totalPrice: order.totalPrice,
      currency: 'LKR',
      paymentMethod: order.paymentMethod || 'PayHere',
      isPaid: Boolean(order.isPaid),
      orderItems: order.orderItems || [],
      shippingAddress: order.shippingAddress,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'ORDER_CREATED',
      metadata: { orderId: order._id, totalPrice: order.totalPrice },
    });
  }

  /**
   * Send Order Shipped Notification
   */
  async sendOrderShippedNotification(order, { carrier = 'Express Delivery', trackingNumber = '' } = {}) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderOrderShippedEmail({
      customerName: recipientName,
      orderId: order._id,
      carrier,
      trackingNumber,
      orderItems: order.orderItems || [],
      shippingAddress: order.shippingAddress,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'ORDER_SHIPPED',
      metadata: { orderId: order._id, carrier, trackingNumber },
    });
  }

  /**
   * Send Order Delivered Notification
   */
  async sendOrderDeliveredNotification(order) {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderOrderDeliveredEmail({
      customerName: recipientName,
      orderId: order._id,
      orderItems: order.orderItems || [],
      deliveredAt: order.deliveredAt || new Date(),
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'ORDER_DELIVERED',
      metadata: { orderId: order._id },
    });
  }

  /**
   * Send Order Cancelled Notification
   */
  async sendOrderCancelledNotification(order, reason = 'Order cancelled') {
    if (!order) return;
    const { email: recipientEmail, name: recipientName } = await this.resolveOrderRecipient(order);

    if (!recipientEmail) return;

    const rendered = templates.renderOrderCancelledEmail({
      customerName: recipientName,
      orderId: order._id,
      reason,
    });

    return await this.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      type: 'ORDER_CANCELLED',
      metadata: { orderId: order._id, reason },
    });
  }

  /**
   * Query Notification Logs (Admin)
   */
  async getNotificationHistory(queryParams = {}) {
    const { page = 1, limit = 20, type, status, recipientEmail } = queryParams;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (recipientEmail) filter.recipientEmail = recipientEmail.toLowerCase().trim();

    const total = await NotificationLog.countDocuments(filter);
    const logs = await NotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }
}

module.exports = new NotificationService();
