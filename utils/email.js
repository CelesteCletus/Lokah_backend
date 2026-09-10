import nodemailer from 'nodemailer';

// All email delivery is configured via environment variables only —
// never hardcode SMTP credentials or API keys here.
//
// Required in production for password-reset emails to actually send:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// If these aren't configured, we log a clear warning and skip sending
// rather than crashing the request — the reset flow still behaves securely
// (generic response, token still generated) but delivery won't happen
// until SMTP is configured.

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

export const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const t = getTransporter();
  if (!t) {
    console.warn('⚠️  SMTP not configured (SMTP_HOST/PORT/USER/PASS) — password reset email not sent.');
    console.warn('   Configure these environment variables to enable real email delivery.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await t.sendMail({
    from,
    to: toEmail,
    subject: 'Reset your Lokah Builders admin password',
    text:
      `A password reset was requested for your Lokah Builders admin account.\n\n` +
      `Reset your password using this link (valid for 30 minutes):\n${resetUrl}\n\n` +
      `If you did not request this, you can safely ignore this email — your password will not be changed.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>A password reset was requested for your Lokah Builders admin account.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p style="font-size:13px;color:#555;">This link is valid for 30 minutes and can only be used once.</p>
        <p style="font-size:13px;color:#555;">If you did not request this, you can safely ignore this email — your password will not be changed.</p>
      </div>
    `,
  });

  return { sent: true };
};
