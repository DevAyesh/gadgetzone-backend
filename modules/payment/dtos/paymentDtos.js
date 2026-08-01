/**
 * Data Transfer Objects and Validators for PayHere Payment Module
 */

const validatePayHereHashRequest = (data) => {
  const errors = [];
  if (!data.order_id) {
    errors.push('order_id is required');
  }
  if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount))) {
    errors.push('Valid amount is required');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validatePayHereNotifyInput = (data) => {
  const errors = [];
  if (!data.merchant_id || !data.order_id || !data.payhere_amount || !data.status_code || !data.md5sig) {
    errors.push('Missing mandatory PayHere webhook parameters');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};

const toPayHereHashResponseDTO = ({ merchant_id, order_id, amount, currency, hash }) => {
  return {
    merchant_id,
    order_id,
    amount: Number(amount).toFixed(2),
    currency,
    hash,
  };
};

module.exports = {
  validatePayHereHashRequest,
  validatePayHereNotifyInput,
  toPayHereHashResponseDTO,
};
