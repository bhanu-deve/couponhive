const nodemailer = require('nodemailer');

// ── Create reusable transporter ───────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});

// ── Verify SMTP connection on startup ─────────────────────
transporter.verify((err) => {
  if (err) console.warn('⚠️  Mail transport not ready:', err.message);
  else     console.log('✅  Mail transport ready — SMTP connected');
});

// ── OTP Email template ────────────────────────────────────
exports.sendOTPEmail = async ({ to, username, otp, expiresMinutes }) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CouponHive — Password Reset OTP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; font-family: 'Segoe UI', Arial, sans-serif; color: #f0f0f8; padding: 20px; }
    .wrapper { max-width: 520px; margin: 0 auto; }
    .card { background: #1a1a24; border: 1px solid #2a2a3a; border-radius: 20px; overflow: hidden; }

    /* Header */
    .header { padding: 32px; text-align: center; border-bottom: 1px solid #2a2a3a; background: linear-gradient(135deg, #1a1a24, #13131a); }
    .logo-emoji { font-size: 2.5rem; display: block; margin-bottom: 8px; }
    .logo-name  { font-size: 1.6rem; font-weight: 800; color: #f5c518; letter-spacing: -0.5px; }

    /* Body */
    .body { padding: 32px; }
    .greeting { font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; }
    .message  { font-size: 0.95rem; color: #9090b0; line-height: 1.7; margin-bottom: 28px; }
    .message strong { color: #f0f0f8; }

    /* OTP Box */
    .otp-box { background: #0a0a0f; border: 2px dashed #f5c518; border-radius: 16px; padding: 28px 20px; text-align: center; margin-bottom: 28px; }
    .otp-label { font-size: 0.72rem; color: #8888aa; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 14px; }
    .otp-digits { font-size: 3rem; font-weight: 800; letter-spacing: 0.35em; color: #f5c518; font-family: 'Courier New', monospace; line-height: 1; }
    .otp-expiry { font-size: 0.8rem; color: #8888aa; margin-top: 12px; }
    .otp-expiry span { color: #f5c518; font-weight: 600; }

    /* Warning */
    .warning { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; padding: 14px 18px; font-size: 0.82rem; color: #f87171; line-height: 1.6; margin-bottom: 8px; }

    /* Footer */
    .footer { padding: 20px 32px; border-top: 1px solid #2a2a3a; text-align: center; font-size: 0.75rem; color: #444460; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <div class="header">
        <span class="logo-emoji">🎟️</span>
        <div class="logo-name">CouponHive</div>
      </div>

      <div class="body">
        <div class="greeting">Hi ${username} 👋</div>
        <div class="message">
          We received a request to reset your password.<br/>
          Use the OTP below to continue. This code is valid for
          <strong>${expiresMinutes} minutes</strong> and can only be used once.
        </div>

        <div class="otp-box">
          <div class="otp-label">Your One-Time Password</div>
          <div class="otp-digits">${otp}</div>
          <div class="otp-expiry">⏱ Expires in <span>${expiresMinutes} minutes</span></div>
        </div>

        <div class="warning">
          🔒 <strong>Did not request this?</strong> Ignore this email safely —
          your password will remain unchanged and this OTP will expire automatically.
          Never share this code with anyone.
        </div>
      </div>

      <div class="footer">
        © ${new Date().getFullYear()} CouponHive &nbsp;·&nbsp;
        This is an automated message — please do not reply to this email.
      </div>

    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || `"CouponHive" <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} — Your CouponHive password reset OTP`,
    html,
    text: `Hi ${username},\n\nYour CouponHive password reset OTP is: ${otp}\n\nThis code expires in ${expiresMinutes} minutes.\n\nIf you did not request this, please ignore this email.\n\n© CouponHive`,
  });
};
