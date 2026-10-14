require('dotenv').config();
const notificationService = require('../modules/notification/notificationService');

async function testSend() {
  const targetEmail = 'akilashashimantha84@gmail.com';
  console.log(`Sending live test email via SendGrid to: ${targetEmail}...`);
  console.log(`Sender: ${process.env.SENDGRID_FROM_EMAIL}`);

  const result = await notificationService.sendEmail({
    to: targetEmail,
    toName: 'Akila Shashimantha',
    subject: 'GadgetZone Notification Service - Verification Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">GadgetZone Notification Service</h2>
        <p>Hello <strong>Akila</strong>,</p>
        <p>This is a live test email confirming that your <strong>SendGrid Integration</strong> with the <strong>GadgetZone Microservice Backend</strong> is fully operational!</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #166534; font-size: 15px;">✓ Live Email Transport Verified</p>
          <p style="margin: 6px 0 0 0; color: #374151; font-size: 13px;">Sender: ${process.env.SENDGRID_FROM_EMAIL}</p>
          <p style="margin: 2px 0 0 0; color: #374151; font-size: 13px;">Timestamp: ${new Date().toUTCString()}</p>
        </div>
        <p style="color: #4b5563; font-size: 14px;">The notification microservice is ready to handle:</p>
        <ul style="color: #4b5563; font-size: 13px; line-height: 1.6;">
          <li>Registration Confirmation OTP</li>
          <li>Login 2FA OTP</li>
          <li>Password Reset OTP & Confirmations</li>
          <li>PayHere Payment Success & Failure Alerts</li>
          <li>Order Management Lifecycle (Created, Shipped, Delivered, Cancelled)</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">GadgetZone Automated Notification Service</p>
      </div>
    `,
    type: 'GENERIC',
    metadata: { testRecipient: targetEmail, trigger: 'cli_verification' }
  });

  console.log('Dispatch Result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

testSend().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
