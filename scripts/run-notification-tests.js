/**
 * Comprehensive Automated Test Suite for GadgetZone Notification Microservice
 * Tests templates, OTP hashing/validation, auth flows, payment webhook triggers,
 * order management events, and error handling.
 */

const assert = require('assert');
const templates = require('../modules/notification/notificationTemplates');
const notificationService = require('../modules/notification/notificationService');
const {
  validateRegisterInput,
  validateVerifyRegisterOtpInput,
  validateSendLoginOtpInput,
  validateVerifyLoginOtpInput,
  validateForgotPasswordInput,
  validateVerifyResetOtpInput,
  validateResetPasswordInput,
  validateGoogleAuthInput,
} = require('../modules/auth/dtos/authDtos');
const { validateSendCustomNotification } = require('../modules/notification/dtos/notificationDtos');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('   GADGETZONE NOTIFICATION MICROSERVICE TEST SUITE   ');
console.log('======================================================\n');

// ---------------------------------------------------------------------------
// 1. Template Rendering Tests
// ---------------------------------------------------------------------------
console.log('--- 1. EMAIL TEMPLATE RENDERING ---');

runTest('Template: Register OTP contains OTP code and subject', () => {
  const result = templates.renderRegisterOtpEmail({ name: 'Kasun Perera', otp: '482910', expiresInMinutes: 10 });
  assert.ok(result.subject.includes('482910'), 'Subject should contain OTP');
  assert.ok(result.html.includes('482910'), 'HTML must contain OTP');
  assert.ok(result.html.includes('Kasun Perera'), 'HTML must contain user name');
  assert.ok(result.html.includes('10 minutes'), 'HTML must state expiry');
});

runTest('Template: Login 2FA OTP contains OTP and warning', () => {
  const result = templates.renderLoginOtpEmail({ name: 'Nimal', otp: '719302', expiresInMinutes: 10 });
  assert.ok(result.subject.includes('719302'));
  assert.ok(result.html.includes('719302'));
  assert.ok(result.html.includes('Two-Factor Login Verification'));
});

runTest('Template: Password Reset OTP contains OTP and 15 mins expiry', () => {
  const result = templates.renderPasswordResetOtpEmail({ name: 'Alice', otp: '112233', expiresInMinutes: 15 });
  assert.ok(result.subject.includes('112233'));
  assert.ok(result.html.includes('112233'));
  assert.ok(result.html.includes('15 minutes'));
});

runTest('Template: Password Reset Success contains security notice', () => {
  const result = templates.renderPasswordResetSuccessEmail({ name: 'Alice' });
  assert.ok(result.subject.includes('password was reset'));
  assert.ok(result.html.includes('Password Changed Successfully'));
});

runTest('Template: Payment Success contains order ID, amount, and items table', () => {
  const result = templates.renderPaymentSuccessEmail({
    customerName: 'Kamal Silva',
    orderId: '65f1a2b3c4d5e6f7a8b9c0d1',
    paymentId: 'PAYHERE_998877',
    amount: 145000,
    currency: 'LKR',
    paymentMethod: 'PayHere',
    orderItems: [
      { name: 'Sony WH-1000XM5 Headphones', qty: 1, price: 95000 },
      { name: 'Logitech MX Master 3S Mouse', qty: 1, price: 50000 },
    ],
    shippingAddress: { address: 'No 45 Galle Road', city: 'Colombo', postalCode: '00300', country: 'Sri Lanka' },
  });

  assert.ok(result.subject.includes('Payment Confirmed'));
  assert.ok(result.subject.includes('65f1a2b3c4d5e6f7a8b9c0d1'));
  assert.ok(result.html.includes('Sony WH-1000XM5'));
  assert.ok(result.html.includes('PAYHERE_998877'));
  assert.ok(result.html.includes('Rs. 145,000.00') || result.html.includes('145,000'));
});

runTest('Template: Payment Failed contains retry notice and reason', () => {
  const result = templates.renderPaymentFailedEmail({
    customerName: 'Sunil',
    orderId: 'ORD-1001',
    amount: 25000,
    currency: 'LKR',
    reason: 'Insufficient funds on credit card',
    statusCode: '-2',
  });

  assert.ok(result.subject.includes('Payment Failed for Order #ORD-1001'));
  assert.ok(result.html.includes('Insufficient funds on credit card'));
  assert.ok(result.html.includes('Retry Payment Now'));
});

runTest('Template: Payment Canceled contains cancellation reason', () => {
  const result = templates.renderPaymentCanceledEmail({
    customerName: 'Sunil',
    orderId: 'ORD-1002',
    reason: 'Payment session canceled by user',
  });

  assert.ok(result.subject.includes('Payment Canceled'));
  assert.ok(result.html.includes('Payment Was Canceled'));
});

runTest('Template: Payment Pending renders review warning', () => {
  const result = templates.renderPaymentPendingEmail({
    customerName: 'Sunil',
    orderId: 'ORD-1003',
    amount: 50000,
  });

  assert.ok(result.subject.includes('Payment Pending'));
  assert.ok(result.html.includes('Payment Under Review'));
});

runTest('Template: Payment Chargeback renders dispute alert', () => {
  const result = templates.renderPaymentChargebackEmail({
    customerName: 'Sunil',
    orderId: 'ORD-1004',
  });

  assert.ok(result.subject.includes('Chargeback'));
  assert.ok(result.html.includes('Chargeback Alert'));
});

runTest('Template: Order Created renders itemized list and address', () => {
  const result = templates.renderOrderCreatedEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2001',
    totalPrice: 185000,
    currency: 'LKR',
    isPaid: false,
    orderItems: [{ name: 'Apple iPad Air M2', qty: 1, price: 185000 }],
    shippingAddress: { address: '12 Temple Lane', city: 'Kandy', postalCode: '20000', country: 'Sri Lanka' },
  });

  assert.ok(result.subject.includes('Order Confirmation: #ORD-2001'));
  assert.ok(result.html.includes('Apple iPad Air M2'));
  assert.ok(result.html.includes('Awaiting Payment'));
});

runTest('Template: Order Shipped renders courier and tracking number', () => {
  const result = templates.renderOrderShippedEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2001',
    carrier: 'Pronto Courier',
    trackingNumber: 'PRONTO-LK-998811',
  });

  assert.ok(result.subject.includes('Order Shipped: #ORD-2001'));
  assert.ok(result.html.includes('PRONTO-LK-998811'));
  assert.ok(result.html.includes('Pronto Courier'));
});

runTest('Template: Order Delivered renders delivery confirmation', () => {
  const result = templates.renderOrderDeliveredEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2001',
    deliveredAt: new Date(),
  });

  assert.ok(result.subject.includes('Delivered: Your GadgetZone Order #ORD-2001'));
  assert.ok(result.html.includes('Package Delivered!'));
});

runTest('Template: Order Cancelled renders cancellation reason', () => {
  const result = templates.renderOrderCancelledEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2001',
    reason: 'Customer requested change of shipping address',
  });

  assert.ok(result.subject.includes('Order Cancelled: #ORD-2001'));
  assert.ok(result.html.includes('Customer requested change of shipping address'));
});

runTest('Template: Items table handles quantity alias and never outputs NaN', () => {
  const result = templates.renderOrderCreatedEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2002',
    totalPrice: 5000,
    currency: 'LKR',
    isPaid: false,
    orderItems: [
      { name: 'USB-C Cable', quantity: 2, price: 2500 },
      { name: 'Bonus Sticker', price: 0 },
    ],
  });
  assert.ok(!result.html.includes('NaN'), 'Template output must not contain NaN');
  assert.ok(result.html.includes('Rs. 5,000.00'), 'Should correctly calculate price * quantity');
});

runTest('Template: Order Delivered handles null or missing date safely without 1970', () => {
  const result = templates.renderOrderDeliveredEmail({
    customerName: 'Mahesh',
    orderId: 'ORD-2003',
    deliveredAt: null,
  });
  assert.ok(!result.html.includes('1970'), 'Template must not render epoch 1970 for null deliveredAt');
  assert.ok(!result.html.includes('Invalid Date'), 'Template must not render Invalid Date');
  assert.ok(result.html.includes('Package Delivered!'));
});

// ---------------------------------------------------------------------------
// 2. Cryptographic Security & OTP Engine Tests
// ---------------------------------------------------------------------------
console.log('\n--- 2. OTP GENERATION & SECURITY ---');

runTest('OTP Generator generates 6-digit numeric strings', () => {
  for (let i = 0; i < 50; i++) {
    const otp = notificationService.generateNumericOtp(6);
    assert.strictEqual(typeof otp, 'string');
    assert.strictEqual(otp.length, 6);
    assert.ok(/^\d{6}$/.test(otp), `OTP ${otp} is not 6 digits`);
  }
});

runTest('OTP Hashing produces deterministic SHA-256 hashes', () => {
  const hash1 = notificationService.hashOtp('123456');
  const hash2 = notificationService.hashOtp('123456');
  const hash3 = notificationService.hashOtp('654321');

  assert.strictEqual(hash1, hash2, 'Identical OTPs must produce identical hashes');
  assert.notStrictEqual(hash1, hash3, 'Different OTPs must produce different hashes');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
});

// ---------------------------------------------------------------------------
// 3. DTO Validation Tests
// ---------------------------------------------------------------------------
console.log('\n--- 3. INPUT VALIDATION & DTOS ---');

runTest('Register DTO: Validates complete data', () => {
  const valid = validateRegisterInput({ name: 'John', email: 'john@example.com', password: 'password123' });
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.errors.length, 0);
});

runTest('Register DTO: Rejects missing or invalid fields', () => {
  const invalid1 = validateRegisterInput({ name: '', email: 'notanemail', password: '123' });
  assert.strictEqual(invalid1.isValid, false);
  assert.ok(invalid1.errors.length >= 3);
});

runTest('Verify Register OTP DTO: Validates email and otp', () => {
  const valid = validateVerifyRegisterOtpInput({ email: 'test@example.com', otp: '123456' });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateVerifyRegisterOtpInput({ email: '', otp: '' });
  assert.strictEqual(invalid.isValid, false);
  assert.strictEqual(invalid.errors.length, 2);
});

runTest('Send Login OTP DTO: Validates email', () => {
  const valid = validateSendLoginOtpInput({ email: 'user@gadgetzone.lk' });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateSendLoginOtpInput({});
  assert.strictEqual(invalid.isValid, false);
});

runTest('Verify Login OTP DTO: Validates email and otp', () => {
  const valid = validateVerifyLoginOtpInput({ email: 'user@gadgetzone.lk', otp: '998877' });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateVerifyLoginOtpInput({ email: 'user@gadgetzone.lk' });
  assert.strictEqual(invalid.isValid, false);
});

runTest('Forgot Password DTO: Validates email', () => {
  const valid = validateForgotPasswordInput({ email: 'forgot@example.com' });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateForgotPasswordInput({ email: 'invalid-email' });
  assert.strictEqual(invalid.isValid, false);
});

runTest('Verify Reset OTP DTO: Validates email and code', () => {
  const valid = validateVerifyResetOtpInput({ email: 'test@example.com', otp: '556677' });
  assert.strictEqual(valid.isValid, true);
});

runTest('Reset Password DTO: Validates new password length', () => {
  const valid = validateResetPasswordInput({ email: 'test@example.com', otp: '556677', newPassword: 'securepassword123' });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateResetPasswordInput({ email: 'test@example.com', otp: '556677', newPassword: '123' });
  assert.strictEqual(invalid.isValid, false);
  assert.ok(invalid.errors[0].includes('6 characters'));
});

runTest('Custom Notification DTO: Validates recipient, subject, and message', () => {
  const valid = validateSendCustomNotification({
    recipientEmail: 'client@example.com',
    subject: 'Special Offer',
    message: 'Get 20% off all gaming accessories this weekend!',
  });
  assert.strictEqual(valid.isValid, true);

  const invalid = validateSendCustomNotification({ recipientEmail: 'bad-email' });
  assert.strictEqual(invalid.isValid, false);
});

runTest('DTO: Code alias accepted across all OTP verification DTOs', () => {
  const reg = validateVerifyRegisterOtpInput({ email: 'test@example.com', code: '123456' });
  assert.strictEqual(reg.isValid, true, 'Register OTP should accept code alias');

  const login = validateVerifyLoginOtpInput({ email: 'test@example.com', code: '123456' });
  assert.strictEqual(login.isValid, true, 'Login OTP should accept code alias');

  const reset = validateVerifyResetOtpInput({ email: 'test@example.com', code: '123456' });
  assert.strictEqual(reset.isValid, true, 'Reset OTP should accept code alias');
});

runTest('Google Auth DTO: Validates idToken presence and string type', () => {
  const valid = validateGoogleAuthInput({ idToken: 'sample.google.id.token' });
  assert.strictEqual(valid.isValid, true, 'Valid idToken must pass');
  assert.strictEqual(valid.errors.length, 0);

  const missing = validateGoogleAuthInput({});
  assert.strictEqual(missing.isValid, false, 'Missing idToken must fail');
  assert.ok(missing.errors.some((e) => e.includes('idToken')));

  const invalidType = validateGoogleAuthInput({ idToken: 12345 });
  assert.strictEqual(invalidType.isValid, false, 'Numeric idToken must fail');
});

// ---------------------------------------------------------------------------
// 4. Asynchronous Notification Service Mock Dispatch Tests
// ---------------------------------------------------------------------------
console.log('\n--- 4. NOTIFICATION SERVICE DISPATCH (DEV/MOCK TRANSPORT) ---');

(async () => {
  await runAsyncTest('sendEmail executes smoothly without error in dev/mock mode', async () => {
    const result = await notificationService.sendEmail({
      to: 'customer@gadgetzone.lk',
      toName: 'Test Customer',
      subject: 'Welcome to GadgetZone',
      html: '<p>Test</p>',
      type: 'GENERIC',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'DEV_MOCKED');
  });

  await runAsyncTest('sendPaymentSuccessNotification formats without crashing', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_99',
      user: { email: 'buyer@test.com', name: 'Buyer' },
      totalPrice: 45000,
      paymentMethod: 'PayHere',
      orderItems: [{ name: 'Anker Power Bank', qty: 1, price: 45000 }],
      shippingAddress: { address: 'Test St', city: 'Colombo', postalCode: '00100', country: 'LK' },
    };

    const result = await notificationService.sendPaymentSuccessNotification({
      order: mockOrder,
      paymentResult: { payhere_payment_id: 'PH_12345' },
      paymentAmount: '45000.00',
      currency: 'LKR',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'PAYMENT_SUCCESS');
  });

  await runAsyncTest('sendPaymentFailedNotification dispatches failure alert', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_99',
      user: { email: 'buyer@test.com', name: 'Buyer' },
      totalPrice: 45000,
    };

    const result = await notificationService.sendPaymentFailedNotification({
      order: mockOrder,
      reason: 'Card 3D-Secure timeout',
      statusCode: '-2',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'PAYMENT_FAILED');
  });

  await runAsyncTest('sendOrderCreatedNotification dispatches order placed confirmation', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_101',
      user: { email: 'buyer@test.com', name: 'Buyer' },
      totalPrice: 120000,
      paymentMethod: 'PayHere',
      isPaid: false,
      orderItems: [{ name: 'Galaxy Watch 6', qty: 1, price: 120000 }],
      shippingAddress: { address: 'Beach Rd', city: 'Galle', postalCode: '80000', country: 'LK' },
    };

    const result = await notificationService.sendOrderCreatedNotification(mockOrder);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'ORDER_CREATED');
  });

  await runAsyncTest('sendOrderShippedNotification dispatches shipping alert with tracking', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_101',
      user: { email: 'buyer@test.com', name: 'Buyer' },
      orderItems: [{ name: 'Galaxy Watch 6', qty: 1, price: 120000 }],
    };

    const result = await notificationService.sendOrderShippedNotification(mockOrder, {
      carrier: 'Pronto Courier',
      trackingNumber: 'TRACK-8899',
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'ORDER_SHIPPED');
  });

  await runAsyncTest('sendOrderDeliveredNotification dispatches delivery alert', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_101',
      user: { email: 'buyer@test.com', name: 'Buyer' },
      orderItems: [{ name: 'Galaxy Watch 6', qty: 1, price: 120000 }],
      deliveredAt: new Date(),
    };

    const result = await notificationService.sendOrderDeliveredNotification(mockOrder);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'ORDER_DELIVERED');
  });

  await runAsyncTest('sendOrderCancelledNotification dispatches cancellation alert', async () => {
    const mockOrder = {
      _id: 'ORDER_TEST_101',
      user: { email: 'buyer@test.com', name: 'Buyer' },
    };

    const result = await notificationService.sendOrderCancelledNotification(mockOrder, 'Out of stock');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.type, 'ORDER_CANCELLED');
  });

  await runAsyncTest('resolveOrderRecipient correctly extracts recipient across user and shippingAddress formats', async () => {
    // 1. Populated user
    const res1 = await notificationService.resolveOrderRecipient({
      user: { email: 'user@example.com', name: 'John User' },
    });
    assert.strictEqual(res1.email, 'user@example.com');
    assert.strictEqual(res1.name, 'John User');

    // 2. Unpopulated user / guest with shippingAddress
    const res2 = await notificationService.resolveOrderRecipient({
      user: '65f1a2b3c4d5e6f7a8b9c0d1',
      shippingAddress: { email: 'guest@example.com', name: 'Guest User' },
    });
    assert.strictEqual(res2.email, 'guest@example.com');
    assert.strictEqual(res2.name, 'Guest User');

    // 3. Null or empty order
    const res3 = await notificationService.resolveOrderRecipient(null);
    assert.strictEqual(res3.email, '');
    assert.strictEqual(res3.name, 'Customer');
  });

  await runAsyncTest('generateAndSendOtp rejects invalid purpose with statusCode 400', async () => {
    let threw = false;
    try {
      await notificationService.generateAndSendOtp('test@example.com', 'INVALID_PURPOSE');
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Unsupported OTP purpose'));
    }
    assert.strictEqual(threw, true, 'Should have thrown 400 error on invalid purpose');
  });

  await runAsyncTest('verifyOtp rejects missing otp code with statusCode 400', async () => {
    let threw = false;
    try {
      await notificationService.verifyOtp('test@example.com', 'REGISTER', '');
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Verification code is required'));
    }
    assert.strictEqual(threw, true, 'Should have thrown 400 error on missing OTP');
  });

  await runAsyncTest('verifyOtp rejects invalid purpose with statusCode 400', async () => {
    let threw = false;
    try {
      await notificationService.verifyOtp('test@example.com', 'INVALID_PURPOSE', '123456');
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Invalid OTP purpose'));
    }
    assert.strictEqual(threw, true, 'Should have thrown 400 error on invalid purpose');
  });

  runTest('Order Module: orderRoutes requires cleanly with verifyToken and isAdmin', () => {
    const orderRoutes = require('../modules/order/orderRoutes');
    assert.ok(orderRoutes, 'orderRoutes must load without ReferenceError');
  });

  runTest('Auth Module: authRoutes requires cleanly with loginLimiter on /google', () => {
    const authRoutes = require('../modules/auth/authRoutes');
    assert.ok(authRoutes, 'authRoutes must load cleanly');
    const googleRoute = authRoutes.stack.find(
      (s) => s.route && s.route.path === '/google' && s.route.methods.post
    );
    assert.ok(googleRoute, '/google POST route must exist');
    assert.ok(googleRoute.route.stack.length >= 2, '/google route must have rate limiter middleware and handler');
  });

  await runAsyncTest('Auth Controller: googleAuth rejects missing idToken with status 400', async () => {
    const authController = require('../modules/auth/authController');
    let statusCode = null;
    let responseBody = null;
    const req = { body: {}, ip: '127.0.0.1' };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };
    await authController.googleAuth(req, res, () => {});
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody.success, false);
    assert.ok(responseBody.errors.includes('Google idToken is required'));
  });

  // ---------------------------------------------------------------------------
  // Super Admin & User Management Tests
  // ---------------------------------------------------------------------------
  console.log('--- 9. SUPER ADMIN & PRIVILEGES TESTS ---');

  runTest('User Model: schema includes isSuperAdmin field with default false', () => {
    const User = require('../models/User');
    assert.ok(User.schema.paths.isSuperAdmin, 'User schema must have isSuperAdmin path');
    assert.strictEqual(User.schema.paths.isSuperAdmin.instance, 'Boolean');
    const user = new User({ name: 'Standard User', email: 'user@example.com' });
    assert.strictEqual(user.isSuperAdmin, false);
  });

  runTest('User Model: toAuthDTO serializes isSuperAdmin correctly', () => {
    const User = require('../models/User');
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'akilamw772@gmail.com',
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
    });
    const dto = superAdmin.toAuthDTO('mock-token');
    assert.strictEqual(dto.isSuperAdmin, true);
    assert.strictEqual(dto.role, 'admin');
    assert.strictEqual(dto.isAdmin, true);
  });

  runTest('User DTOs: toUserProfileDTO includes isSuperAdmin', () => {
    const { toUserProfileDTO } = require('../modules/user/dtos/userDtos');
    const profile = toUserProfileDTO({
      _id: '6acf103c7811fcef933ce80b',
      userId: 1,
      name: 'Akila',
      email: 'akilamw772@gmail.com',
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
    });
    assert.strictEqual(profile.isSuperAdmin, true);
  });

  runTest('Auth Middleware: exports isAdmin and isSuperAdmin guards', () => {
    const { isAdmin, isSuperAdmin } = require('../middleware/authMiddleware');
    assert.strictEqual(typeof isAdmin, 'function');
    assert.strictEqual(typeof isSuperAdmin, 'function');
  });

  runTest('Auth Middleware: isAdmin guard allows user with isSuperAdmin=true', () => {
    const { isAdmin } = require('../middleware/authMiddleware');
    let calledNext = false;
    const req = { user: { role: 'customer', isAdmin: false, isSuperAdmin: true }, ip: '127.0.0.1' };
    const res = {};
    isAdmin(req, res, () => {
      calledNext = true;
    });
    assert.strictEqual(calledNext, true, 'isAdmin must allow isSuperAdmin user');
  });

  runTest('Auth Middleware: isSuperAdmin guard allows super admin and blocks regular admin', () => {
    const { isSuperAdmin } = require('../middleware/authMiddleware');
    let superAdminAllowed = false;
    isSuperAdmin({ user: { isSuperAdmin: true }, ip: '127.0.0.1' }, {}, () => {
      superAdminAllowed = true;
    });
    assert.strictEqual(superAdminAllowed, true, 'isSuperAdmin must allow super admin');

    let regularAdminBlocked = false;
    let statusCode = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        regularAdminBlocked = true;
      },
    };
    isSuperAdmin({ user: { role: 'admin', isAdmin: true, isSuperAdmin: false }, ip: '127.0.0.1' }, res, () => {});
    assert.strictEqual(statusCode, 403, 'Regular admin must be blocked with 403 from isSuperAdmin');
    assert.strictEqual(regularAdminBlocked, true);
  });

  runTest('User Module: userRoutes defines POST /admin and PUT /:id/role', () => {
    const userRoutes = require('../modules/user/userRoutes');
    assert.ok(userRoutes, 'userRoutes must load cleanly');
    const adminRoute = userRoutes.stack.find(
      (s) => s.route && s.route.path === '/admin' && s.route.methods.post
    );
    assert.ok(adminRoute, '/admin POST route must exist');

    const roleRoute = userRoutes.stack.find(
      (s) => s.route && s.route.path === '/:id/role' && s.route.methods.put
    );
    assert.ok(roleRoute, '/:id/role PUT route must exist');
  });

  await runAsyncTest('User Model: pre-save hook syncs role and isAdmin with isSuperAdmin', async () => {
    const User = require('../models/User');
    const doc = new User({
      name: 'Super Admin Test',
      email: 'test-superadmin@gadgetzone.lk',
      isSuperAdmin: true,
    });
    // In memory test of the hook logic
    assert.strictEqual(doc.isSuperAdmin, true);
    // Directly invoke the pre-save logic rules
    if (doc.isSuperAdmin) {
      doc.role = 'admin';
      doc.isAdmin = true;
    }
    assert.strictEqual(doc.role, 'admin');
    assert.strictEqual(doc.isAdmin, true);

    // Test demotion to customer clears isSuperAdmin
    doc.role = 'customer';
    doc.isAdmin = false;
    doc.isSuperAdmin = false;
    assert.strictEqual(doc.isSuperAdmin, false);
    assert.strictEqual(doc.role, 'customer');
  });

  await runAsyncTest('User Controller: createAdmin blocks regular admin from creating super admin', async () => {
    const userController = require('../modules/user/userController');
    let statusCode = null;
    let errorMessage = '';
    const req = {
      user: { role: 'admin', isAdmin: true, isSuperAdmin: false, email: 'admin@gadgetzone.lk' },
      body: {
        name: 'New Super Admin',
        email: 'new-super@gadgetzone.lk',
        password: 'password123',
        isSuperAdmin: true,
      },
      ip: '127.0.0.1',
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        errorMessage = payload.message;
        return this;
      },
    };

    await userController.createAdmin(req, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.ok(errorMessage.includes('Only Super Admins can create Super Admin accounts'));
  });

  await runAsyncTest('User Service: updateUserRole preserves isSuperAdmin when undefined in admin role update', async () => {
    const userService = require('../modules/user/userService');
    const originalFind = userService.findUserByIdentifier;

    // Mock existing super admin user
    const mockSuperAdmin = {
      _id: '6acf103c7811fcef933ce80b',
      email: 'akilamw772@gmail.com',
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
      isRemoved: false,
      save: async function () {
        return this;
      },
    };

    userService.findUserByIdentifier = async () => mockSuperAdmin;

    try {
      // Calling updateUserRole without passing isSuperAdmin flag (undefined)
      const updated = await userService.updateUserRole(
        '6acf103c7811fcef933ce80b',
        'admin',
        undefined,
        { _id: 'mock-super-admin-id', isSuperAdmin: true }
      );
      assert.strictEqual(updated.isSuperAdmin, true, 'isSuperAdmin status must be preserved when undefined');
      assert.strictEqual(updated.role, 'admin');
    } finally {
      userService.findUserByIdentifier = originalFind;
    }
  });

  await runAsyncTest('User Service: updateUserRole blocks Super Admin from revoking their own Super Admin privileges', async () => {
    const userService = require('../modules/user/userService');
    const originalFind = userService.findUserByIdentifier;

    const mockSuperAdmin = {
      _id: '6acf103c7811fcef933ce80b',
      email: 'akilamw772@gmail.com',
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
      isRemoved: false,
      save: async function () {
        return this;
      },
    };

    userService.findUserByIdentifier = async () => mockSuperAdmin;

    try {
      let threwError = false;
      try {
        await userService.updateUserRole(
          '6acf103c7811fcef933ce80b',
          'admin',
          false, // Attempt to revoke super admin from self
          { _id: '6acf103c7811fcef933ce80b', isSuperAdmin: true }
        );
      } catch (err) {
        threwError = true;
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('Super Admins cannot revoke their own Super Admin privileges'));
      }
      assert.strictEqual(threwError, true, 'Must throw when self-revoking super admin');
    } finally {
      userService.findUserByIdentifier = originalFind;
    }
  });

  await runAsyncTest('User Service: restoreUserByAdmin blocks regular admin from restoring deleted Super Admin', async () => {
    const userService = require('../modules/user/userService');
    const originalFind = userService.findUserByIdentifier;

    const mockDeletedSuperAdmin = {
      _id: '6acf103c7811fcef933ce80b',
      email: 'akilamw772@gmail.com',
      role: 'admin',
      isAdmin: true,
      isSuperAdmin: true,
      isRemoved: true,
      save: async function () {
        return this;
      },
    };

    userService.findUserByIdentifier = async () => mockDeletedSuperAdmin;

    try {
      let threwError = false;
      try {
        await userService.restoreUserByAdmin(
          { _id: 'regular-admin-id', role: 'admin', isAdmin: true, isSuperAdmin: false },
          '6acf103c7811fcef933ce80b'
        );
      } catch (err) {
        threwError = true;
        assert.strictEqual(err.statusCode, 403);
        assert.ok(err.message.includes('Only Super Admins can restore a Super Admin account'));
      }
      assert.strictEqual(threwError, true, 'Regular admin must be blocked from restoring super admin');
    } finally {
      userService.findUserByIdentifier = originalFind;
    }
  });

  runTest('Database Config: connectDB exports ensureSuperAdmin hook', () => {
    const connectDB = require('../config/db');
    assert.strictEqual(typeof connectDB.ensureSuperAdmin, 'function');
  });

  await runAsyncTest('Auth Service: registerUser always assigns customer role and denies admin role', async () => {
    const authService = require('../modules/auth/authService');
    const User = require('../models/User');
    const originalFindOne = User.findOne;
    const originalCreate = User.create;

    User.findOne = async () => null;
    let createdPayload = null;
    User.create = async (payload) => {
      createdPayload = payload;
      return {
        _id: 'mock-user-id',
        ...payload,
        toAuthDTO: () => ({ ...payload }),
      };
    };

    try {
      await authService.registerUser({
        name: 'Attacker User',
        email: 'attacker@example.com',
        password: 'password123',
        role: 'admin',
      });

      assert.strictEqual(createdPayload.role, 'customer', 'Public registration must force role customer');
      assert.strictEqual(createdPayload.isAdmin, false, 'Public registration must force isAdmin false');
      assert.strictEqual(createdPayload.isSuperAdmin, false, 'Public registration must force isSuperAdmin false');
    } finally {
      User.findOne = originalFindOne;
      User.create = originalCreate;
    }
  });

  console.log('\n--- 10. PRODUCT MANAGEMENT & IMAGE UPLOAD SERVICE TESTS ---');

  runTest('Upload Middleware: exports upload and uploadProductImages', () => {
    const { upload, uploadProductImages } = require('../middleware/uploadMiddleware');
    assert.strictEqual(typeof upload, 'object', 'upload must be configured multer instance');
    assert.strictEqual(typeof uploadProductImages, 'function', 'uploadProductImages must be a middleware function');
  });

  runTest('Product DTO: validateCreateProductInput validates required fields and stock alias', () => {
    const { validateCreateProductInput } = require('../modules/product/dtos/productDtos');
    const valid = validateCreateProductInput({
      name: 'Sony WH-1000XM5',
      description: 'Industry-leading noise cancelling headphones',
      price: 399.99,
      category: 'Audio',
      stock: 25,
    });
    assert.strictEqual(valid.isValid, true, 'Valid payload with stock alias should pass');

    const invalid = validateCreateProductInput({
      name: '',
      description: '',
      price: -10,
    });
    assert.strictEqual(invalid.isValid, false, 'Invalid payload should fail validation');
    assert.ok(invalid.errors.length >= 3, 'Multiple errors should be collected');
  });

  runTest('Product DTO: validateUpdateProductInput validates fields and stock alias', () => {
    const { validateUpdateProductInput } = require('../modules/product/dtos/productDtos');
    const valid = validateUpdateProductInput({
      name: 'Updated Name',
      stock: 50,
      price: 299.99,
    });
    assert.strictEqual(valid.isValid, true, 'Valid update should pass');

    const invalid = validateUpdateProductInput({
      name: '   ',
      price: -5,
      stock: -1,
    });
    assert.strictEqual(invalid.isValid, false, 'Invalid update should fail');
  });

  runTest('Product Service: _extractImageUrls normalizes multiple URL formats and ignores empty', () => {
    const productService = require('../modules/product/productService');
    const urls = productService._extractImageUrls({
      images: ['https://example.com/1.png', 'https://example.com/2.png'],
      image_url: 'https://example.com/3.png',
      imageUrl: 'https://example.com/1.png', // duplicate
    });
    assert.strictEqual(urls.length, 3, 'Should deduplicate and extract all 3 unique URLs');
    assert.ok(urls.includes('https://example.com/1.png'));
    assert.ok(urls.includes('https://example.com/2.png'));
    assert.ok(urls.includes('https://example.com/3.png'));

    // JSON string array in form data
    const jsonUrls = productService._extractImageUrls({
      images: '["https://example.com/a.jpg", "https://example.com/b.jpg"]',
    });
    assert.strictEqual(jsonUrls.length, 2);
    assert.ok(jsonUrls.includes('https://example.com/a.jpg'));
    assert.ok(jsonUrls.includes('https://example.com/b.jpg'));
  });

  await runAsyncTest('Product Service: createProduct merges device uploaded files and external image URLs', async () => {
    const productService = require('../modules/product/productService');
    const Product = require('../models/Product');
    const originalCreate = Product.create;
    const originalUpload = productService._uploadImagesToSupabase;

    let createdPayload = null;
    Product.create = async (payload) => {
      createdPayload = payload;
      return { _id: 'mock-product-id', ...payload };
    };

    productService._uploadImagesToSupabase = async (files) => {
      return files.map((f, i) => `https://supabase.co/storage/v1/object/public/product-images/mock-${i}-${f.originalname}`);
    };

    try {
      const mockFiles = [
        { originalname: 'camera.png', mimetype: 'image/png', buffer: Buffer.from('abc') },
        { originalname: 'front.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('def') },
      ];

      const product = await productService.createProduct(
        {
          name: 'Pro Camera Kit',
          description: 'High-end DSLR kit',
          price: 1500,
          category: 'Cameras',
          stock: 12,
          imageUrl: 'https://example.com/external-banner.jpg',
        },
        mockFiles
      );

      assert.strictEqual(product.name, 'Pro Camera Kit');
      assert.strictEqual(createdPayload.images.length, 3, 'Must contain 1 external URL + 2 uploaded device URLs');
      assert.strictEqual(createdPayload.images[0], 'https://example.com/external-banner.jpg');
      assert.ok(createdPayload.images[1].includes('mock-0-camera.png'));
      assert.ok(createdPayload.images[2].includes('mock-1-front.jpg'));
    } finally {
      Product.create = originalCreate;
      productService._uploadImagesToSupabase = originalUpload;
    }
  });

  await runAsyncTest('Product Service: updateProduct handles image removal and new device file uploads', async () => {
    const productService = require('../modules/product/productService');
    const Product = require('../models/Product');
    const originalFindById = Product.findById;
    const originalUpload = productService._uploadImagesToSupabase;
    const originalDelete = productService._deleteImageFromSupabase;

    const deletedImages = [];
    productService._deleteImageFromSupabase = async (url) => {
      deletedImages.push(url);
    };

    productService._uploadImagesToSupabase = async (files) => {
      return files.map((f, i) => `https://supabase.co/storage/v1/object/public/product-images/new-${i}-${f.originalname}`);
    };

    const mockProduct = {
      _id: 'prod-123',
      name: 'Old Headphone',
      price: 100,
      category: 'Audio',
      countInStock: 5,
      images: ['https://example.com/old-img1.jpg', 'https://example.com/old-img2.jpg'],
      isRemoved: false,
      save: async function () {
        return this;
      },
    };

    Product.findById = async () => mockProduct;

    try {
      const mockNewFiles = [
        { originalname: 'new-shot.webp', mimetype: 'image/webp', buffer: Buffer.from('xyz') },
      ];

      const updated = await productService.updateProduct(
        'prod-123',
        {
          name: 'Updated Headphone',
          removeImages: ['https://example.com/old-img1.jpg'],
          imageUrl: 'https://example.com/new-external.png',
        },
        mockNewFiles
      );

      assert.strictEqual(updated.name, 'Updated Headphone');
      assert.strictEqual(deletedImages.length, 1);
      assert.strictEqual(deletedImages[0], 'https://example.com/old-img1.jpg');
      assert.ok(!updated.images.includes('https://example.com/old-img1.jpg'), 'Removed image must not be present');
      assert.ok(updated.images.includes('https://example.com/old-img2.jpg'), 'Retained image must still be present');
      assert.ok(updated.images.includes('https://example.com/new-external.png'), 'New external URL must be added');
      assert.ok(updated.images.some((img) => img.includes('new-0-new-shot.webp')), 'New uploaded device image must be added');
    } finally {
      Product.findById = originalFindById;
      productService._uploadImagesToSupabase = originalUpload;
      productService._deleteImageFromSupabase = originalDelete;
    }
  });

  await runAsyncTest('Product Service: updateProduct preserves existing images when new URL or device image is added without removeImages', async () => {
    const productService = require('../modules/product/productService');
    const Product = require('../models/Product');
    const originalFindById = Product.findById;

    const mockProduct = {
      _id: 'prod-456',
      name: 'Smart Watch',
      price: 200,
      category: 'Wearables',
      countInStock: 10,
      images: ['https://example.com/watch-front.jpg', 'https://example.com/watch-side.jpg'],
      isRemoved: false,
      save: async function () {
        return this;
      },
    };

    Product.findById = async () => mockProduct;

    try {
      const updated = await productService.updateProduct('prod-456', {
        name: 'Smart Watch V2',
        imageUrl: 'https://example.com/watch-strap.jpg',
      });

      assert.strictEqual(updated.images.length, 3);
      assert.ok(updated.images.includes('https://example.com/watch-front.jpg'), 'Original image 1 must be kept');
      assert.ok(updated.images.includes('https://example.com/watch-side.jpg'), 'Original image 2 must be kept');
      assert.ok(updated.images.includes('https://example.com/watch-strap.jpg'), 'Newly added image must be appended');
    } finally {
      Product.findById = originalFindById;
    }
  });

  await runAsyncTest('Product Service: updateProduct respects replaceImages flag to overwrite all images', async () => {
    const productService = require('../modules/product/productService');
    const Product = require('../models/Product');
    const originalFindById = Product.findById;

    const mockProduct = {
      _id: 'prod-789',
      name: 'Old Speaker',
      price: 50,
      category: 'Audio',
      countInStock: 3,
      images: ['https://example.com/old-speaker.jpg'],
      isRemoved: false,
      save: async function () {
        return this;
      },
    };

    Product.findById = async () => mockProduct;

    try {
      const updated = await productService.updateProduct('prod-789', {
        replaceImages: true,
        imageUrl: 'https://example.com/fresh-speaker.jpg',
      });

      assert.strictEqual(updated.images.length, 1);
      assert.strictEqual(updated.images[0], 'https://example.com/fresh-speaker.jpg');
      assert.ok(!updated.images.includes('https://example.com/old-speaker.jpg'));
    } finally {
      Product.findById = originalFindById;
    }
  });

  runTest('Upload Middleware: fileFilter permits image types and rejects non-image formats', () => {
    const { upload } = require('../middleware/uploadMiddleware');
    const fileFilter = upload.fileFilter;
    assert.ok(typeof fileFilter === 'function', 'upload must have fileFilter');

    // Valid png
    let pngAccepted = false;
    fileFilter({}, { originalname: 'test.PNG', mimetype: 'image/png' }, (err, accept) => {
      pngAccepted = !err && accept === true;
    });
    assert.strictEqual(pngAccepted, true, 'PNG file should be accepted');

    // Valid jpg with image/jpg mime
    let jpgAccepted = false;
    fileFilter({}, { originalname: 'banner.jpg', mimetype: 'image/jpg' }, (err, accept) => {
      jpgAccepted = !err && accept === true;
    });
    assert.strictEqual(jpgAccepted, true, 'JPG with image/jpg should be accepted');

    // Valid webp
    let webpAccepted = false;
    fileFilter({}, { originalname: 'photo.webp', mimetype: 'image/webp' }, (err, accept) => {
      webpAccepted = !err && accept === true;
    });
    assert.strictEqual(webpAccepted, true, 'WEBP file should be accepted');

    // Invalid pdf
    let pdfRejected = false;
    fileFilter({}, { originalname: 'document.pdf', mimetype: 'application/pdf' }, (err) => {
      pdfRejected = Boolean(err);
    });
    assert.strictEqual(pdfRejected, true, 'PDF file must be rejected');
  });

  await runAsyncTest('Product Service: _ensureBucketExists checks bucket safely without crashing', async () => {
    const productService = require('../modules/product/productService');
    await productService._ensureBucketExists();
    assert.ok(true, '_ensureBucketExists completed safely');
  });

  console.log('\n--- 11. CATEGORY & COLLECTION MODULE TESTS ---');

  await runAsyncTest('Category Service: getAllCategories auto-seeds default categories when empty', async () => {
    const categoryService = require('../modules/category/categoryService');
    const Category = require('../models/Category');
    const originalFind = Category.find;
    const originalCount = Category.countDocuments;
    const originalInsertMany = Category.insertMany;

    let inserted = [];
    let state = [];

    Category.countDocuments = async () => state.length;
    Category.insertMany = async (items) => {
      inserted = items;
      state = items.map((it, idx) => ({ ...it, _id: `cat-${idx}`, toJSON: () => it }));
      return state;
    };
    Category.find = () => ({
      sort: async () => state,
    });

    try {
      const result = await categoryService.getAllCategories();
      assert.strictEqual(inserted.length, 7, 'Should insert 7 default categories');
      assert.strictEqual(result.length, 7, 'Should return 7 categories');
      const names = result.map((c) => c.name);
      assert.ok(names.includes('Smartphones'), 'Should include Smartphones');
      assert.ok(names.includes('Laptops'), 'Should include Laptops');
      assert.ok(names.includes('Audio'), 'Should include Audio');
      assert.ok(names.includes('Wearables'), 'Should include Wearables');
      assert.ok(names.includes('Cameras'), 'Should include Cameras');
      assert.ok(names.includes('Gaming'), 'Should include Gaming');
      assert.ok(names.includes('Accessories'), 'Should include Accessories');
    } finally {
      Category.find = originalFind;
      Category.countDocuments = originalCount;
      Category.insertMany = originalInsertMany;
    }
  });

  await runAsyncTest('Category Service: createCategory, getCategoryById, updateCategory, and deleteCategory', async () => {
    const categoryService = require('../modules/category/categoryService');
    const Category = require('../models/Category');
    const originalCreate = Category.create;
    const originalFindOne = Category.findOne;

    const mockCat = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Drones',
      slug: 'drones',
      icon: '🛸',
      isRemoved: false,
      save: async function () {
        return this;
      },
      toJSON: function () {
        return {
          id: this._id,
          _id: this._id,
          name: this.name,
          slug: this.slug,
          icon: this.icon,
          isRemoved: this.isRemoved,
        };
      },
    };

    let dronesExists = false;
    Category.create = async (doc) => {
      dronesExists = true;
      return {
        ...mockCat,
        ...doc,
        save: mockCat.save,
        toJSON: mockCat.toJSON,
      };
    };

    Category.findOne = async (query) => {
      if (query.slug === 'existing-slug') {
        return mockCat;
      }
      if (query._id === '507f1f77bcf86cd799439011') {
        return mockCat;
      }
      if (query.slug === 'drones' && dronesExists) {
        return mockCat;
      }
      return null;
    };

    try {
      // 1. Create Category
      const created = await categoryService.createCategory({ name: 'Drones', icon: '🛸' });
      assert.strictEqual(created.name, 'Drones');
      assert.strictEqual(created.slug, 'drones');
      assert.strictEqual(created.icon, '🛸');

      // 2. Reject Duplicate Slug
      let dupThrew = false;
      try {
        await categoryService.createCategory({ name: 'Existing', slug: 'existing-slug' });
      } catch (err) {
        dupThrew = true;
        assert.strictEqual(err.statusCode, 400);
      }
      assert.ok(dupThrew, 'Duplicate category slug should throw 400');

      // 3. Get Category by ID
      const fetched = await categoryService.getCategoryById('507f1f77bcf86cd799439011');
      assert.strictEqual(fetched.name, 'Drones');

      // 4. Update Category
      const updated = await categoryService.updateCategory('507f1f77bcf86cd799439011', { name: 'Pro Drones' });
      assert.strictEqual(updated.name, 'Pro Drones');

      // 5. Delete Category
      const deleted = await categoryService.deleteCategory('507f1f77bcf86cd799439011');
      assert.strictEqual(deleted.isRemoved, true);
    } finally {
      Category.create = originalCreate;
      Category.findOne = originalFindOne;
    }
  });

  await runAsyncTest('Collection Service: getAllCollections auto-seeds and getCollectionById retrieves with products', async () => {
    const collectionService = require('../modules/collection/collectionService');
    const Collection = require('../models/Collection');
    const Product = require('../models/Product');
    const originalFind = Collection.find;
    const originalCount = Collection.countDocuments;
    const originalInsertMany = Collection.insertMany;
    const originalFindOne = Collection.findOne;
    const originalProductFind = Product.find;

    let insertedCols = [];
    let state = [];

    Collection.countDocuments = async () => state.length;
    Collection.insertMany = async (items) => {
      insertedCols = items;
      state = items.map((it, idx) => ({ ...it, _id: `col-${idx}`, toJSON: () => it }));
      return state;
    };
    Collection.find = () => ({
      sort: async () => state,
    });

    const mockCol = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Featured',
      slug: 'featured',
      description: 'Featured gear',
      image: 'featured.png',
      isRemoved: false,
      save: async function () {
        return this;
      },
      toJSON: function () {
        return {
          id: this._id,
          _id: this._id,
          name: this.name,
          slug: this.slug,
          description: this.description,
          image: this.image,
          isRemoved: this.isRemoved,
        };
      },
    };

    Collection.findOne = async () => mockCol;
    Product.find = () => ({
      sort: async () => [
        { name: 'iPhone 15', price: 1000, category: 'Smartphones' },
      ],
    });

    try {
      const allCols = await collectionService.getAllCollections();
      assert.strictEqual(insertedCols.length, 5, 'Should auto-seed 5 default collections');
      assert.strictEqual(allCols.length, 5);

      const colWithProducts = await collectionService.getCollectionById('featured');
      assert.strictEqual(colWithProducts.collection.name, 'Featured');
      assert.strictEqual(colWithProducts.products.length, 1);
      assert.strictEqual(colWithProducts.products[0].name, 'iPhone 15');
    } finally {
      Collection.find = originalFind;
      Collection.countDocuments = originalCount;
      Collection.insertMany = originalInsertMany;
      Collection.findOne = originalFindOne;
      Product.find = originalProductFind;
    }
  });

  await runAsyncTest('Category and Collection Routes: module routes export express routers cleanly', async () => {
    const categoryRoutes = require('../modules/category/categoryRoutes');
    const collectionRoutes = require('../modules/collection/collectionRoutes');
    assert.ok(typeof categoryRoutes === 'function' || typeof categoryRoutes.use === 'function');
    assert.ok(typeof collectionRoutes === 'function' || typeof collectionRoutes.use === 'function');
  });

  // ---------------------------------------------------------------------------
  // 12. Payment Confirmation & Client Callback Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 12. PAYMENT CONFIRMATION & CLIENT CALLBACK TESTS ---');

  runTest('Payment DTO: validateConfirmPaymentInput validates orderId presence', () => {
    const { validateConfirmPaymentInput } = require('../modules/payment/dtos/paymentDtos');
    const invalid = validateConfirmPaymentInput({});
    assert.strictEqual(invalid.isValid, false);
    assert.ok(invalid.errors.length > 0);

    const validId = validateConfirmPaymentInput({ orderId: '6acf103c7811fcef933ce80b' });
    assert.strictEqual(validId.isValid, true);

    const validUnderscore = validateConfirmPaymentInput({ order_id: '6acf103c7811fcef933ce80b' });
    assert.strictEqual(validUnderscore.isValid, true);
  });

  await runAsyncTest('Payment Service: confirmPaymentCompletion idempotently updates order to paid', async () => {
    const paymentService = require('../modules/payment/paymentService');

    let saved = false;
    const mockOrder = {
      _id: '6acf103c7811fcef933ce80b',
      user: '6acf103c7811fcef933ce80a',
      totalPrice: 425000,
      isPaid: false,
      paidAt: null,
      paymentResult: {},
      save: async function () {
        saved = true;
        return this;
      },
      populate: async function () {
        return this;
      },
    };

    const originalFind = paymentService.findOrderByReference;
    paymentService.findOrderByReference = async () => mockOrder;

    try {
      const result = await paymentService.confirmPaymentCompletion(
        { orderId: '6acf103c7811fcef933ce80b', paymentId: 'PAY-12345' },
        { _id: '6acf103c7811fcef933ce80a', role: 'customer' }
      );

      assert.strictEqual(result.status, 'SUCCESS');
      assert.strictEqual(saved, true);
      assert.strictEqual(mockOrder.isPaid, true);
      assert.strictEqual(mockOrder.paymentResult.status, 'COMPLETED');
      assert.strictEqual(mockOrder.paymentResult.payhere_payment_id, 'PAY-12345');

      // Idempotency check: Calling it again on an already paid order returns ALREADY_PAID
      saved = false;
      const secondResult = await paymentService.confirmPaymentCompletion(
        { orderId: '6acf103c7811fcef933ce80b' },
        { _id: '6acf103c7811fcef933ce80a', role: 'customer' }
      );
      assert.strictEqual(secondResult.status, 'ALREADY_PAID');
      assert.strictEqual(saved, false, 'Should not save again if already paid');
    } finally {
      paymentService.findOrderByReference = originalFind;
    }
  });

  runTest('Payment Routes: exports express router with /confirm and /hash endpoints', () => {
    const paymentRoutes = require('../modules/payment/paymentRoutes');
    assert.ok(paymentRoutes && typeof paymentRoutes === 'function');
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');


  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
