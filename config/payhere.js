module.exports = {
  merchantId: process.env.PAYHERE_MERCHANT_ID || '123456',
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || 'secret123',
  mode: process.env.PAYHERE_MODE || 'sandbox',
  currency: 'LKR',
};
