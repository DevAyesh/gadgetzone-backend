const notificationService = require('./notificationService');
const { validateSendCustomNotification, toNotificationLogDTO } = require('./dtos/notificationDtos');
const { successResponse, errorResponse } = require('../../common/dtos/responseDto');

class NotificationController {
  /**
   * @route   POST /api/notifications/test
   * @desc    Send test email to verify SendGrid or dev email transport
   * @access  Private/Admin
   */
  async sendTestEmail(req, res, next) {
    try {
      const { email } = req.body;
      const targetEmail = email || req.user?.email;

      if (!targetEmail) {
        return errorResponse(res, 400, 'Recipient email is required');
      }

      const result = await notificationService.sendEmail({
        to: targetEmail,
        toName: req.user?.name || 'Tester',
        subject: 'GadgetZone Notification Service Test',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #334155;">
            <h2 style="color: #2563eb;">Notification Microservice Test</h2>
            <p>Congratulations! The GadgetZone notification system is operational.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        type: 'GENERIC',
        metadata: { triggeredBy: req.user?._id || 'SYSTEM' },
      });

      return successResponse(res, 200, 'Test email processed', result);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/notifications/send-custom
   * @desc    Send a custom email notification (Admin only)
   * @access  Private/Admin
   */
  async sendCustomNotification(req, res, next) {
    try {
      const validation = validateSendCustomNotification(req.body);
      if (!validation.isValid) {
        return errorResponse(res, 400, 'Validation Failed', validation.errors);
      }

      const { recipientEmail, recipientName, subject, message } = req.body;
      const result = await notificationService.sendEmail({
        to: recipientEmail,
        toName: recipientName || '',
        subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #334155;">
            <h2 style="color: #2563eb;">${subject}</h2>
            <p>${message}</p>
          </div>
        `,
        type: 'GENERIC',
        metadata: { sentByAdmin: req.user?._id },
      });

      return successResponse(res, 200, 'Custom notification dispatched', result);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   GET /api/notifications/history
   * @desc    Get notification audit logs
   * @access  Private/Admin
   */
  async getNotificationHistory(req, res, next) {
    try {
      const { logs, pagination } = await notificationService.getNotificationHistory(req.query);
      const dtoList = logs.map(toNotificationLogDTO);

      return successResponse(res, 200, 'Notification logs fetched successfully', {
        logs: dtoList,
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
   * @route   POST /api/notifications/verify-otp
   * @desc    General endpoint to verify any OTP
   * @access  Public
   */
  async verifyOtp(req, res, next) {
    try {
      const body = req.body || {};
      const { email, purpose } = body;
      const otp = body.otp || body.code;

      if (!email || !purpose || !otp) {
        return errorResponse(res, 400, 'email, purpose, and otp (or code) are all required');
      }

      if (!['REGISTER', 'LOGIN', 'PASSWORD_RESET'].includes(purpose)) {
        return errorResponse(res, 400, 'Invalid purpose. Must be REGISTER, LOGIN, or PASSWORD_RESET');
      }

      const result = await notificationService.verifyOtp(email, purpose, otp, true);
      return successResponse(res, 200, 'OTP verified successfully', result);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }

  /**
   * @route   POST /api/notifications/resend-otp
   * @desc    General endpoint to resend an OTP
   * @access  Public
   */
  async resendOtp(req, res, next) {
    try {
      const body = req.body || {};
      const { email, purpose, name } = body;

      if (!email || !purpose) {
        return errorResponse(res, 400, 'email and purpose are required');
      }

      if (!['REGISTER', 'LOGIN', 'PASSWORD_RESET'].includes(purpose)) {
        return errorResponse(res, 400, 'Invalid purpose. Must be REGISTER, LOGIN, or PASSWORD_RESET');
      }

      await notificationService.generateAndSendOtp(email, purpose, name || '', 10);
      return successResponse(res, 200, `Verification OTP resent successfully to ${email}`);
    } catch (error) {
      if (error.statusCode) {
        return errorResponse(res, error.statusCode, error.message);
      }
      next(error);
    }
  }
}

module.exports = new NotificationController();
