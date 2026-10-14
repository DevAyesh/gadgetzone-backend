/**
 * Notification Microservice DTOs & Input Validators
 */

const validateSendCustomNotification = (data = {}) => {
  const errors = [];
  const { recipientEmail, subject, message } = data;

  if (!recipientEmail || typeof recipientEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(recipientEmail.trim())) {
    errors.push('A valid recipientEmail is required');
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    errors.push('subject is required');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    errors.push('message is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toNotificationLogDTO = (log) => {
  if (!log) return null;
  return {
    id: log._id,
    recipientEmail: log.recipientEmail,
    recipientName: log.recipientName,
    type: log.type,
    subject: log.subject,
    status: log.status,
    metadata: log.metadata || {},
    error: log.error || null,
    createdAt: log.createdAt,
  };
};

module.exports = {
  validateSendCustomNotification,
  toNotificationLogDTO,
};
