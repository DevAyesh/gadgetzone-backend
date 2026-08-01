const paymentService = require('./paymentService');
const {
  validatePayHereHashRequest,
  validatePayHereNotifyInput,
  toPayHereHashResponseDTO,
} = require('./dtos/paymentDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class PaymentController {
  /**
   * @route   POST /api/payments/hash
   * @desc    Generate PayHere MD5 cryptographic hash for checkout
   * @access  Private
   */
  async generateHash(req, res, next) {
    try {
      const validation = validatePayHereHashRequest(req.body);
      if (!validation.isValid) {
        console.warn(`[PAYMENT WARN] PAYHERE HASH REQUEST VALIDATION FAILED FROM USER ID ${req.user?._id}: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const hashData = paymentService.generatePayHereHash(req.body);
      const responseDto = toPayHereHashResponseDTO(hashData);

      console.log(`[PAYMENT INFO] PAYHERE MD5 CHECKOUT HASH GENERATED FOR ORDER: ${req.body.order_id.toUpperCase()}, AMOUNT: ${req.body.amount} ${req.body.currency?.toUpperCase() || 'LKR'}, USER ID: ${req.user?._id}`);
      return successResponse(res, 200, 'PayHere hash generated successfully', responseDto);
    } catch (error) {
      if (error.statusCode) {
        console.error(`[PAYMENT ERROR] FAILED TO GENERATE PAYHERE HASH: ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/payments/notify
   * @desc    PayHere Payment Notification Webhook Callback
   * @access  Public
   */
  async handleWebhook(req, res, next) {
    try {
      const notifyData = req.body;
      console.log(`[PAYMENT WEBHOOK] RECEIVED PAYHERE CALLBACK FOR ORDER: ${notifyData.order_id?.toUpperCase()}, STATUS CODE: ${notifyData.status_code}, AMOUNT: ${notifyData.payhere_amount} ${notifyData.payhere_currency?.toUpperCase()}`);

      const validation = validatePayHereNotifyInput(notifyData);
      if (!validation.isValid) {
        console.warn(`[PAYMENT WARN] INVALID PAYHERE WEBHOOK CALLBACK PAYLOAD FORMAT: ${validation.errors.join(', ').toUpperCase()}`);
        return errorResponse(res, 400, 'Invalid PayHere callback notification format', validation.errors);
      }

      const result = await paymentService.processPaymentNotification(notifyData);
      console.log(`[PAYMENT WEBHOOK SUCCESS] ${result.message.toUpperCase()} (ORDER ID: ${result.orderId})`);

      return successResponse(res, 200, 'Webhook processed successfully', result);
    } catch (error) {
      if (error.statusCode) {
        console.error(`[PAYMENT ALERT] PAYHERE WEBHOOK VERIFICATION ERROR FOR ORDER '${req.body.order_id?.toUpperCase()}': ${error.message.toUpperCase()}`);
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new PaymentController();
