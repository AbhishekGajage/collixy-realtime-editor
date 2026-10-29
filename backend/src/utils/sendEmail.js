// utils/sendEmail.js
const nodemailer = require('nodemailer');

/**
 * Send an email using Nodemailer.
 *
 * Required env vars:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
 *
 * @param {Object} options
 * @param {string} options.to       – Recipient email address
 * @param {string} options.subject  – Email subject line
 * @param {string} options.html     – HTML body
 * @param {string} [options.text]   – Plain-text fallback (optional)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Validate required env vars
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.error('❌ Email configuration missing. Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD');
    throw new Error('Email service is not configured on the server.');
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10) || 587,
    secure: parseInt(EMAIL_PORT, 10) === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: EMAIL_FROM || `"Collixy" <${EMAIL_USER}>`,
    to,
    subject,
    html,
    ...(text && { text }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

module.exports = sendEmail;
