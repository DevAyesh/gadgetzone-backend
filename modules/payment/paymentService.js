const crypto = require('crypto');
const payhereConfig = require('../../config/payhere');
const Order = require('../../models/Order');
const notificationService = require('../notification/notificationService');

class PaymentService {
  /**
   * Helper to format amount to 2 decimal places (e.g., "25000.00")
   */
  formatAmount(amount) {
    const num = Number(amount);
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  }

  /**
   * Helper to get uppercase MD5 hash of merchant secret
   */
  getHashedSecret(merchantSecret = payhereConfig.merchantSecret) {
    return crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  }

  /**
   * Generate PayHere Checkout MD5 Hash Signature
   */
  generatePayHereHash({ order_id, amount, isMinorUnits = false, currency = payhereConfig.currency }) {
    const merchantId = payhereConfig.merchantId;
    let numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      numericAmount = 0;
    }

    if (isMinorUnits) {
      numericAmount = numericAmount / 100;
    }

    const formattedAmount = this.formatAmount(numericAmount);
    const hashedSecret = this.getHashedSecret();

    const rawString = merchantId + order_id + formattedAmount + currency + hashedSecret;
    const hash = crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();

    return {
      merchant_id: merchantId,
      order_id,
      amount: formattedAmount,
      currency,
      hash,
    };
  }

  /**
   * Helper to find an order by MongoDB ID or paymentResult reference
   */
  async findOrderByReference(order_id) {
    let order = null;
    try {
      order = await Order.findById(order_id);
    } catch {
      // order_id is not a valid ObjectId, search by custom payment reference
      order = await Order.findOne({ 'paymentResult.id': order_id });
    }
    if (!order) {
      order = await Order.findOne({ 'paymentResult.id': order_id });
    }
    return order;
  }

  /**
   * Verify and process PayHere Payment Webhook Callback
   * Triggers corresponding customer email notifications for Success, Failure, Cancellation, etc.
   */
  async processPaymentNotification(notifyData) {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      status_message,
    } = notifyData;

    const formattedPayhereAmount = this.formatAmount(payhere_amount);
    const hashedSecret = this.getHashedSecret();

    // Re-generate MD5 signature for verification according to PayHere documentation:
    // MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret))
    const rawString =
      merchant_id +
      order_id +
      formattedPayhereAmount +
      payhere_currency +
      status_code +
      hashedSecret;

    const localMd5sig = crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();

    // Verify hash integrity
    if (localMd5sig !== String(md5sig).toUpperCase()) {
      console.warn(`[PAYMENT WARN] MD5 SIGNATURE MISMATCH - EXPECTED: ${localMd5sig}, RECEIVED: ${String(md5sig).toUpperCase()}`);
      const error = new Error('PayHere Webhook MD5 Signature Verification Failed');
      error.statusCode = 400;
      throw error;
    }

    const order = await this.findOrderByReference(order_id);
    const statusCodeStr = String(status_code);

    // Status code 2: Payment Successfully Completed
    if (statusCodeStr === '2') {
      if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
          id: order_id,
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          payhere_payment_id: payment_id || '',
        };
        await order.save();

        // Populate user details for email dispatch
        await order.populate('user', 'name email');

        try {
          await notificationService.sendPaymentSuccessNotification({
            order,
            paymentResult: order.paymentResult,
            paymentAmount: formattedPayhereAmount,
            currency: payhere_currency || 'LKR',
          });
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send payment success notification for order ${order._id}:`, notifErr.message);
        }

        return { status: 'SUCCESS', message: 'Order payment status updated successfully and confirmation notification dispatched', orderId: order._id };
      } else {
        return { status: 'WARNING', message: 'Payment verified but order not found in database', orderId: order_id };
      }
    }

    // Status code -2: Payment Failed
    if (statusCodeStr === '-2') {
      if (order) {
        order.paymentResult = {
          id: order_id,
          status: 'FAILED',
          update_time: new Date().toISOString(),
          payhere_payment_id: payment_id || '',
          status_message: status_message || 'Payment declined or transaction failed',
        };
        await order.save();
        await order.populate('user', 'name email');

        try {
          await notificationService.sendPaymentFailedNotification({
            order,
            reason: status_message || 'Transaction declined by bank or card issuer',
            statusCode: status_code,
          });
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send payment failure notification for order ${order._id}:`, notifErr.message);
        }

        return { status: 'FAILED', message: 'Order payment failed and failure notification dispatched', orderId: order._id };
      }
    }

    // Status code -1: Payment Canceled
    if (statusCodeStr === '-1') {
      if (order) {
        order.paymentResult = {
          id: order_id,
          status: 'CANCELED',
          update_time: new Date().toISOString(),
          payhere_payment_id: payment_id || '',
        };
        await order.save();
        await order.populate('user', 'name email');

        try {
          await notificationService.sendPaymentCanceledNotification({
            order,
            reason: status_message || 'Payment session canceled by user',
          });
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send payment canceled notification for order ${order._id}:`, notifErr.message);
        }

        return { status: 'CANCELED', message: 'Order payment was canceled and cancellation notification dispatched', orderId: order._id };
      }
    }

    // Status code -3: Chargeback
    if (statusCodeStr === '-3') {
      if (order) {
        order.paymentResult = {
          id: order_id,
          status: 'CHARGEDBACK',
          update_time: new Date().toISOString(),
          payhere_payment_id: payment_id || '',
        };
        await order.save();
        await order.populate('user', 'name email');

        try {
          await notificationService.sendPaymentChargebackNotification({ order });
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send chargeback alert for order ${order._id}:`, notifErr.message);
        }

        return { status: 'CHARGEDBACK', message: 'Chargeback received and alert dispatched', orderId: order._id };
      }
    }

    // Status code 0: Pending
    if (statusCodeStr === '0') {
      if (order) {
        order.paymentResult = {
          id: order_id,
          status: 'PENDING',
          update_time: new Date().toISOString(),
          payhere_payment_id: payment_id || '',
        };
        await order.save();
        await order.populate('user', 'name email');

        try {
          await notificationService.sendPaymentPendingNotification({ order });
        } catch (notifErr) {
          console.error(`[NOTIFICATION ERROR] Failed to send payment pending notification for order ${order._id}:`, notifErr.message);
        }

        return { status: 'PENDING', message: 'Payment pending confirmation and notification dispatched', orderId: order._id };
      }
    }

    return {
      status: 'PROCESSED',
      message: `Payment status code received: ${status_code}`,
      orderId: order_id,
    };
  }

  /**
   * Confirm payment completion from client-side PayHere onCompleted callback or direct verification
   * Idempotent: If order is already marked paid, returns success without double-processing or duplicate emails.
   */
  async confirmPaymentCompletion(data = {}, requestingUser = null) {
    const rawOrderId = data.orderId || data.order_id;
    if (!rawOrderId) {
      const error = new Error('orderId is required');
      error.statusCode = 400;
      throw error;
    }

    const order = await this.findOrderByReference(rawOrderId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    if (requestingUser) {
      const isOwner = order.user && order.user.toString() === requestingUser._id.toString();
      const isAdmin = requestingUser.role === 'admin' || requestingUser.isAdmin === true || requestingUser.isSuperAdmin === true;
      if (!isOwner && !isAdmin) {
        const error = new Error('Not authorized to confirm payment for this order');
        error.statusCode = 403;
        throw error;
      }
    }

    // Idempotent: If order is already paid, return early
    if (order.isPaid) {
      return {
        status: 'ALREADY_PAID',
        message: 'Order is already marked as paid',
        order,
      };
    }

    const paymentId = data.paymentId || data.payment_id || `PAYHERE-${Date.now()}`;
    const statusMsg = data.status_message || data.status || 'Payment completed via PayHere';

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: rawOrderId,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      payhere_payment_id: paymentId,
      status_message: statusMsg,
    };

    await order.save();
    await order.populate('user', 'name email');

    // Dispatch Payment Success Notification
    try {
      await notificationService.sendPaymentSuccessNotification({
        order,
        paymentResult: order.paymentResult,
        paymentAmount: this.formatAmount(order.totalPrice),
        currency: payhereConfig.currency || 'LKR',
      });
    } catch (notifErr) {
      console.error(`[NOTIFICATION ERROR] Failed to send payment confirmation for order ${order._id}:`, notifErr.message);
    }

    // Dispatch Order Created Notification for PayHere orders
    try {
      await notificationService.sendOrderCreatedNotification(order);
    } catch (notifErr) {
      console.warn(`[NOTIFICATION WARN] Failed to send order creation notification for order ${order._id}:`, notifErr.message);
    }

    return {
      status: 'SUCCESS',
      message: 'Payment confirmed successfully and order updated to paid',
      order,
    };
  }
}

module.exports = new PaymentService();

