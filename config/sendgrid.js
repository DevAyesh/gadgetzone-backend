/**
 * SendGrid Email Service Configuration
 */
const rawKey = (process.env.SENDGRID_API_KEY || '').replace(/Copied!$/i, '').trim();
const rawEmail = (process.env.SENDGRID_FROM_EMAIL || '').trim();
const rawName = (process.env.SENDGRID_FROM_NAME || 'GadgetZone').trim();

module.exports = {
  apiKey: rawKey,
  fromEmail: rawEmail || 'noreply@gadgetzone.lk',
  fromName: rawName || 'GadgetZone',
  isConfigured: Boolean(rawKey && rawKey.startsWith('SG.')),
};

