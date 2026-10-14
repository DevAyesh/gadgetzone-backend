/**
 * Responsive HTML Email Templates for GadgetZone Notifications
 */

const baseEmailLayout = ({ title, preheader = '', contentHtml }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 2px solid #3b82f6;
    }
    .brand-title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .brand-subtitle {
      color: #94a3b8;
      font-size: 13px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .body-content {
      padding: 36px 32px;
      color: #334155;
      line-height: 1.6;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .otp-card {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #2563eb;
      font-family: 'Courier New', Courier, monospace;
      margin: 0;
    }
    .otp-caption {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
      margin-bottom: 0;
    }
    .info-table {
      width: 100%;
      margin: 20px 0;
      font-size: 14px;
    }
    .info-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .info-value {
      color: #0f172a;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
      font-size: 14px;
    }
    .items-table th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background-color: #dcfce7; color: #15803d; }
    .badge-danger { background-color: #fee2e2; color: #b91c1c; }
    .badge-warning { background-color: #fef3c7; color: #b45309; }
    .badge-info { background-color: #e0f2fe; color: #0369a1; }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 16px;
    }
    .btn-danger {
      background: #dc2626;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 20px 0;">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <h1 class="brand-title">Gadget<span class="brand-accent">Zone</span></h1>
            <div class="brand-subtitle">Premium Electronics &amp; Accessories</div>
          </div>
          <div class="body-content">
            ${contentHtml}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GadgetZone Inc. All rights reserved.</p>
            <p>If you have any questions, reach out to our team at <a href="mailto:support@gadgetzone.lk">support@gadgetzone.lk</a></p>
            <p style="margin-top: 10px; font-size: 11px;">This is an automated system notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Register Confirmation OTP Email Template
 */
const renderRegisterOtpEmail = ({ name, otp, expiresInMinutes = 10 }) => {
  const contentHtml = `
    <h2 class="headline">Verify Your Email Address</h2>
    <p>Hello <strong>${name || 'Valued Customer'}</strong>,</p>
    <p>Welcome to <strong>GadgetZone</strong>! To complete your registration and activate your account, please use the verification code below:</p>
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
      <p class="otp-caption">This verification code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
    </div>
    <p style="color: #64748b; font-size: 13px;">For your security, never share this code with anyone. If you did not create a GadgetZone account, please ignore this email.</p>
  `;

  return {
    subject: `${otp} is your GadgetZone registration verification code`,
    html: baseEmailLayout({
      title: 'Verify Your Email - GadgetZone',
      preheader: `Your verification code is ${otp}. Valid for ${expiresInMinutes} minutes.`,
      contentHtml,
    }),
  };
};

/**
 * 2. User Login OTP Email Template
 */
const renderLoginOtpEmail = ({ name, otp, expiresInMinutes = 10 }) => {
  const contentHtml = `
    <h2 class="headline">Two-Factor Login Verification</h2>
    <p>Hello <strong>${name || 'Valued Customer'}</strong>,</p>
    <p>A sign-in attempt was initiated for your GadgetZone account. Please enter the following One-Time Password (OTP) to complete your login:</p>
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
      <p class="otp-caption">This login code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    </div>
    <p style="color: #dc2626; font-size: 13px; font-weight: 500;">
      If you did not initiate this sign-in attempt, please reset your password immediately and contact support.
    </p>
  `;

  return {
    subject: `${otp} is your GadgetZone login verification code`,
    html: baseEmailLayout({
      title: 'Login Verification - GadgetZone',
      preheader: `Your login OTP is ${otp}.`,
      contentHtml,
    }),
  };
};

/**
 * 3. Password Reset OTP Email Template
 */
const renderPasswordResetOtpEmail = ({ name, otp, expiresInMinutes = 15 }) => {
  const contentHtml = `
    <h2 class="headline">Password Reset Request</h2>
    <p>Hello <strong>${name || 'Valued Customer'}</strong>,</p>
    <p>We received a request to reset the password for your GadgetZone account. Use the verification code below to authorize the password reset:</p>
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
      <p class="otp-caption">This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    </div>
    <p style="color: #64748b; font-size: 13px;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  return {
    subject: `${otp} is your GadgetZone password reset code`,
    html: baseEmailLayout({
      title: 'Password Reset - GadgetZone',
      preheader: `Your password reset code is ${otp}.`,
      contentHtml,
    }),
  };
};

/**
 * 4. Password Reset Success Email Template
 */
const renderPasswordResetSuccessEmail = ({ name }) => {
  const contentHtml = `
    <h2 class="headline">Password Changed Successfully</h2>
    <p>Hello <strong>${name || 'Valued Customer'}</strong>,</p>
    <p>Your GadgetZone account password was successfully updated on <strong>${new Date().toLocaleString()}</strong>.</p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: #065f46; font-weight: 500;">Your account is now secured with your new password.</p>
    </div>
    <p style="color: #64748b; font-size: 13px;">
      If you did not authorize this change, please contact our support team immediately at <a href="mailto:support@gadgetzone.lk">support@gadgetzone.lk</a>.
    </p>
  `;

  return {
    subject: 'Security Alert: Your GadgetZone password was reset',
    html: baseEmailLayout({
      title: 'Password Reset Successful - GadgetZone',
      preheader: 'Your password was successfully updated.',
      contentHtml,
    }),
  };
};

const renderItemsTableHtml = (orderItems = []) => {
  if (!orderItems || orderItems.length === 0) return '';
  const rows = orderItems.map((item) => {
    const qty = Number(item.qty || item.quantity || 1);
    let price = Number(item.price || 0);
    // Normalize minor units (cents, x100) from MongoDB to standard Rupees
    if (price > 500000 && price % 100 === 0) {
      price = price / 100;
    }
    const itemTotal = price * qty;
    return `
    <tr>
      <td style="font-weight: 500;">${item.name || 'Item'}</td>
      <td style="text-align: center;">${qty}</td>
      <td style="text-align: right;">Rs. ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: 600;">Rs. ${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `;
  }).join('');

  return `
    <h3 style="font-size: 16px; color: #0f172a; margin-top: 24px; margin-bottom: 8px;">Order Items</h3>
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

/**
 * Helper to render shipping address
 */
const renderShippingAddressHtml = (shippingAddress) => {
  if (!shippingAddress) return '';
  const addrLine = shippingAddress.address || shippingAddress.addressLine1 || '';
  const stateStr = shippingAddress.state ? `, ${shippingAddress.state}` : '';
  const nameLine = shippingAddress.name ? `<strong>${shippingAddress.name}</strong><br>` : '';
  const phoneLine = shippingAddress.phone ? `<br><span style="color: #64748b;">Phone:</span> ${shippingAddress.phone}` : '';

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Shipping Address</div>
      <div style="color: #0f172a; font-size: 14px; line-height: 1.5;">
        ${nameLine}
        ${addrLine}<br>
        ${shippingAddress.city || ''}${stateStr} ${shippingAddress.postalCode || ''}<br>
        ${shippingAddress.country || 'Sri Lanka'}
        ${phoneLine}
      </div>
    </div>
  `;
};

/**
 * 5. Payment Success Notification Email Template
 */
const renderPaymentSuccessEmail = ({
  customerName,
  orderId,
  paymentId,
  amount,
  currency = 'LKR',
  paymentMethod = 'PayHere',
  orderItems = [],
  shippingAddress = null,
}) => {
  let numAmount = Number(amount || 0);
  if (numAmount > 500000 && numAmount % 100 === 0) {
    numAmount = numAmount / 100;
  }
  const formattedAmount = numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success" style="font-size: 14px; padding: 6px 16px;">Payment Confirmed</span>
      <h2 class="headline" style="margin-top: 12px;">Payment Successful!</h2>
      <p style="margin: 0; color: #64748b;">Hello <strong>${customerName || 'Valued Customer'}</strong>, thank you for your purchase! Your transaction has been approved.</p>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">Order Reference</td>
        <td class="info-value">#${orderId}</td>
      </tr>
      <tr>
        <td class="info-label">Payment ID</td>
        <td class="info-value">${paymentId || 'N/A'}</td>
      </tr>
      <tr>
        <td class="info-label">Amount Paid</td>
        <td class="info-value" style="color: #15803d; font-weight: 700; font-size: 16px;">${currency} ${formattedAmount}</td>
      </tr>
      <tr>
        <td class="info-label">Payment Method</td>
        <td class="info-value">${paymentMethod}</td>
      </tr>
      <tr>
        <td class="info-label">Payment Date</td>
        <td class="info-value">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    ${renderItemsTableHtml(orderItems)}
    ${renderShippingAddressHtml(shippingAddress)}

    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #475569; font-size: 14px;">We are currently processing your order for shipment. We will send you another update once it is dispatched.</p>
    </div>
  `;

  return {
    subject: `Payment Confirmed: Order #${orderId} (${currency} ${formattedAmount})`,
    html: baseEmailLayout({
      title: 'Payment Confirmed - GadgetZone',
      preheader: `Your payment of ${currency} ${formattedAmount} for Order #${orderId} was successful!`,
      contentHtml,
    }),
  };
};

/**
 * 6. Payment Failed Notification Email Template
 */
const renderPaymentFailedEmail = ({
  customerName,
  orderId,
  amount,
  currency = 'LKR',
  reason = 'Transaction declined by issuer',
  statusCode = '-2',
}) => {
  const formattedAmount = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-danger" style="font-size: 14px; padding: 6px 16px;">Payment Failed</span>
      <h2 class="headline" style="margin-top: 12px;">Payment Could Not Be Processed</h2>
      <p style="margin: 0; color: #64748b;">Hello <strong>${customerName || 'Valued Customer'}</strong>, we were unable to complete your payment for Order #${orderId}.</p>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">Order Reference</td>
        <td class="info-value">#${orderId}</td>
      </tr>
      <tr>
        <td class="info-label">Attempted Amount</td>
        <td class="info-value">${currency} ${formattedAmount}</td>
      </tr>
      <tr>
        <td class="info-label">Failure Reason</td>
        <td class="info-value" style="color: #b91c1c; font-weight: 600;">${reason} (Code: ${statusCode})</td>
      </tr>
      <tr>
        <td class="info-label">Timestamp</td>
        <td class="info-value">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Don't worry:</strong> Your reserved items have not been discarded. You can retry paying with a different card or contact your bank for more information.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/account?tab=orders&retry=${orderId}" class="btn btn-danger">Retry Payment Now</a>
    </div>
  `;

  return {
    subject: `Action Required: Payment Failed for Order #${orderId}`,
    html: baseEmailLayout({
      title: 'Payment Failed - GadgetZone',
      preheader: `Payment failed for Order #${orderId}. Please retry your payment.`,
      contentHtml,
    }),
  };
};

/**
 * 7. Payment Canceled Notification Email Template
 */
const renderPaymentCanceledEmail = ({ customerName, orderId, reason = 'Payment session canceled by user' }) => {
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-warning" style="font-size: 14px; padding: 6px 16px;">Payment Canceled</span>
      <h2 class="headline" style="margin-top: 12px;">Payment Was Canceled</h2>
      <p style="margin: 0; color: #64748b;">Your checkout transaction for Order #${orderId} was canceled.</p>
    </div>

    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>Your payment attempt for Order <strong>#${orderId}</strong> was not completed. If this was intentional, you may disregard this email. If you experienced any issues at checkout, you can resume your order at any time.</p>
    <p style="font-size: 13px; color: #64748b;">Reason recorded: ${reason}</p>
  `;

  return {
    subject: `Payment Canceled: Order #${orderId}`,
    html: baseEmailLayout({
      title: 'Payment Canceled - GadgetZone',
      preheader: `Your payment for Order #${orderId} was canceled.`,
      contentHtml,
    }),
  };
};

/**
 * 8. Payment Pending / Under Review Email Template
 */
const renderPaymentPendingEmail = ({ customerName, orderId, amount, currency = 'LKR' }) => {
  const formattedAmount = Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-info" style="font-size: 14px; padding: 6px 16px;">Payment Processing</span>
      <h2 class="headline" style="margin-top: 12px;">Payment Under Review</h2>
      <p style="margin: 0; color: #64748b;">We are waiting for final confirmation from PayHere.</p>
    </div>

    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>Your payment of <strong>${currency} ${formattedAmount}</strong> for Order <strong>#${orderId}</strong> is currently pending clearance with your bank or gateway.</p>
    <p>You will receive a confirmation email as soon as the transaction is finalized.</p>
  `;

  return {
    subject: `Payment Pending: Order #${orderId}`,
    html: baseEmailLayout({
      title: 'Payment Pending - GadgetZone',
      preheader: `Payment for Order #${orderId} is currently processing.`,
      contentHtml,
    }),
  };
};

/**
 * 9. Payment Chargeback Notification Email Template
 */
const renderPaymentChargebackEmail = ({ customerName, orderId }) => {
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-danger" style="font-size: 14px; padding: 6px 16px;">Chargeback Alert</span>
      <h2 class="headline" style="margin-top: 12px;">Payment Chargeback Notice</h2>
    </div>
    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>A chargeback/dispute was filed for Order <strong>#${orderId}</strong>. The order processing has been temporarily placed on hold pending investigation.</p>
    <p>Please contact our billing support at <a href="mailto:billing@gadgetzone.lk">billing@gadgetzone.lk</a> to resolve this matter.</p>
  `;

  return {
    subject: `Important: Payment Dispute / Chargeback on Order #${orderId}`,
    html: baseEmailLayout({
      title: 'Chargeback Notice - GadgetZone',
      preheader: `Payment chargeback reported on Order #${orderId}.`,
      contentHtml,
    }),
  };
};

/**
 * 10. Order Placed / Created Notification Email Template
 */
const renderOrderCreatedEmail = ({
  customerName,
  orderId,
  totalPrice,
  currency = 'LKR',
  paymentMethod = 'PayHere',
  isPaid = false,
  orderItems = [],
  shippingAddress = null,
}) => {
  let numTotal = Number(totalPrice || 0);
  if (numTotal > 500000 && numTotal % 100 === 0) {
    numTotal = numTotal / 100;
  }
  const formattedTotal = numTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paymentBadge = isPaid
    ? '<span class="badge badge-success">Paid</span>'
    : '<span class="badge badge-warning">Awaiting Payment</span>';

  const contentHtml = `
    <h2 class="headline">Thank you for your order!</h2>
    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>We have successfully received your order <strong>#${orderId}</strong>. Our team is preparing your gadgets with utmost care.</p>

    <table class="info-table">
      <tr>
        <td class="info-label">Order Number</td>
        <td class="info-value">#${orderId}</td>
      </tr>
      <tr>
        <td class="info-label">Order Date</td>
        <td class="info-value">${new Date().toLocaleString()}</td>
      </tr>
      <tr>
        <td class="info-label">Payment Method</td>
        <td class="info-value">${paymentMethod}</td>
      </tr>
      <tr>
        <td class="info-label">Payment Status</td>
        <td class="info-value">${paymentBadge}</td>
      </tr>
      <tr>
        <td class="info-label">Total Amount</td>
        <td class="info-value" style="font-weight: 700; font-size: 16px;">${currency} ${formattedTotal}</td>
      </tr>
    </table>

    ${renderItemsTableHtml(orderItems)}
    ${renderShippingAddressHtml(shippingAddress)}

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://gadgetzone.lk/account" class="btn">View Order in Account</a>
    </div>
  `;

  return {
    subject: `Order Confirmation: #${orderId} (${currency} ${formattedTotal})`,
    html: baseEmailLayout({
      title: 'Order Confirmation - GadgetZone',
      preheader: `Thank you for your order #${orderId}. Total: ${currency} ${formattedTotal}.`,
      contentHtml,
    }),
  };
};

/**
 * 11. Order Shipped Notification Email Template
 */
const renderOrderShippedEmail = ({
  customerName,
  orderId,
  carrier = 'Pronto Courier',
  trackingNumber = '',
  orderItems = [],
  shippingAddress = null,
}) => {
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-info" style="font-size: 14px; padding: 6px 16px;">Dispatched</span>
      <h2 class="headline" style="margin-top: 12px;">Your Order is On The Way!</h2>
      <p style="margin: 0; color: #64748b;">Hello <strong>${customerName || 'Valued Customer'}</strong>, your package for Order #${orderId} has been dispatched from our fulfillment center.</p>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">Order Reference</td>
        <td class="info-value">#${orderId}</td>
      </tr>
      <tr>
        <td class="info-label">Shipping Carrier</td>
        <td class="info-value">${carrier || 'Express Delivery'}</td>
      </tr>
      ${trackingNumber ? `
      <tr>
        <td class="info-label">Tracking Number</td>
        <td class="info-value" style="font-weight: 700; color: #2563eb;">${trackingNumber}</td>
      </tr>` : ''}
      <tr>
        <td class="info-label">Dispatched Date</td>
        <td class="info-value">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    ${renderItemsTableHtml(orderItems)}
    ${renderShippingAddressHtml(shippingAddress)}

    <p style="text-align: center; color: #64748b; font-size: 14px;">Please have your contact number reachable for the courier delivery agent.</p>
  `;

  return {
    subject: `Order Shipped: #${orderId} is on its way!`,
    html: baseEmailLayout({
      title: 'Order Shipped - GadgetZone',
      preheader: `Your order #${orderId} has been shipped via ${carrier}.`,
      contentHtml,
    }),
  };
};

/**
 * 12. Order Delivered Notification Email Template
 */
const renderOrderDeliveredEmail = ({
  customerName,
  orderId,
  orderItems = [],
  deliveredAt = new Date(),
}) => {
  const safeDeliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success" style="font-size: 14px; padding: 6px 16px;">Delivered</span>
      <h2 class="headline" style="margin-top: 12px;">Package Delivered!</h2>
      <p style="margin: 0; color: #64748b;">Your order #${orderId} has been delivered successfully.</p>
    </div>

    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>We are delighted to confirm that your shipment for Order <strong>#${orderId}</strong> was delivered on <strong>${safeDeliveredAt.toLocaleString()}</strong>.</p>

    ${renderItemsTableHtml(orderItems)}

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-top: 24px;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a;">How was your shopping experience?</p>
      <a href="https://gadgetzone.lk/account" class="btn">Leave Product Review</a>
    </div>
  `;

  return {
    subject: `Delivered: Your GadgetZone Order #${orderId}`,
    html: baseEmailLayout({
      title: 'Order Delivered - GadgetZone',
      preheader: `Your GadgetZone order #${orderId} was delivered!`,
      contentHtml,
    }),
  };
};

/**
 * 13. Order Cancelled Notification Email Template
 */
const renderOrderCancelledEmail = ({ customerName, orderId, reason = 'Order cancelled upon request' }) => {
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-danger" style="font-size: 14px; padding: 6px 16px;">Cancelled</span>
      <h2 class="headline" style="margin-top: 12px;">Order Cancelled</h2>
      <p style="margin: 0; color: #64748b;">Your Order #${orderId} has been cancelled.</p>
    </div>

    <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
    <p>We would like to notify you that Order <strong>#${orderId}</strong> was cancelled.</p>
    <p><strong>Cancellation Reason:</strong> ${reason}</p>
    <p style="color: #64748b; font-size: 13px;">If you have already made payment for this order, your refund will be processed back to your original payment method in accordance with our return and refund policy.</p>
  `;

  return {
    subject: `Order Cancelled: #${orderId}`,
    html: baseEmailLayout({
      title: 'Order Cancelled - GadgetZone',
      preheader: `Order #${orderId} has been cancelled.`,
      contentHtml,
    }),
  };
};

module.exports = {
  renderRegisterOtpEmail,
  renderLoginOtpEmail,
  renderPasswordResetOtpEmail,
  renderPasswordResetSuccessEmail,
  renderPaymentSuccessEmail,
  renderPaymentFailedEmail,
  renderPaymentCanceledEmail,
  renderPaymentPendingEmail,
  renderPaymentChargebackEmail,
  renderOrderCreatedEmail,
  renderOrderShippedEmail,
  renderOrderDeliveredEmail,
  renderOrderCancelledEmail,
};
