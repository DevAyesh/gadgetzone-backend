const crypto = require('crypto');
const payhereConfig = require('../../config/payhere');
const Order = require('../../models/Order');

class PaymentService {
  /**
   * Helper to format amount to 2 decimal places (e.g., "1000.00")
   */
  formatAmount(amount) {
    return Number(amount).toFixed(2);
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
  generatePayHereHash({ order_id, amount, currency = payhereConfig.currency }) {
    const merchantId = payhereConfig.merchantId;
    const formattedAmount = this.formatAmount(amount);
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
   * Verify and process PayHere Payment Webhook Callback
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
      custom_1,
      custom_2,
    } = notifyData;

    const hashedSecret = this.getHashedSecret();

    // Re-generate MD5 signature for verification according to PayHere documentation
    const rawString =
      merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      hashedSecret;

    const localMd5sig = crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();

    // Verify hash integrity
    if (localMd5sig !== md5sig.toUpperCase()) {
      const error = new Error('PayHere Webhook MD5 Signature Verification Failed');
      error.statusCode = 400;
      throw error;
    }

    // Status code 2 indicates successful payment confirmation by PayHere
    if (String(status_code) === '2') {
      let order;
      // Find order by MongoDB ObjectId or custom order_id
      try {
        order = await Order.findById(order_id);
      } catch (e) {
        order = await Order.findOne({ 'paymentResult.id': order_id });
      }

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
        return { status: 'SUCCESS', message: 'Order payment status updated successfully', orderId: order._id };
      } else {
        return { status: 'WARNING', message: 'Payment verified but order not found in database', orderId: order_id };
      }
    }

    return {
      status: 'PROCESSED',
      message: `Payment status code received: ${status_code}`,
      orderId: order_id,
    };
  }
}

module.exports = new PaymentService();
