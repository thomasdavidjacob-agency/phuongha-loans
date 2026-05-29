const { Resend } = require('resend');

const RECIPIENT = ['phuonghaloans@gmail.com', 'phuong.ha@mortgagesolutions.net'];
const FROM_ADDRESS = 'leads@phuongha.loans';

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 1000);
}

module.exports = async function handler(req, res) {
  /* only accept POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* parse body — Vercel provides it pre-parsed for JSON content-type */
  const body = req.body || {};
  const name     = sanitize(body.name);
  const phone    = sanitize(body.phone);
  const email    = sanitize(body.email);
  const loanType = sanitize(body.loanType);
  const message  = sanitize(body.message);

  /* basic server-side validation */
  if (!name || !phone || !email || !loanType) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #0a1628; padding: 28px 32px; }
    .header h1 { color: #c9a84c; font-size: 20px; margin: 0; }
    .header p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 6px 0 0; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 4px; }
    .value { font-size: 15px; color: #1a1a1a; line-height: 1.5; }
    .badge { display: inline-block; background: #0a1628; color: #c9a84c; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.08em; text-transform: uppercase; }
    .divider { border: none; border-top: 1px solid #eeeeee; margin: 24px 0; }
    .footer { background: #f9f9f9; padding: 16px 32px; font-size: 12px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>New Lead — phuongha.loans</h1>
      <p>Submitted ${timestamp} (Pacific Time)</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Full Name</div>
        <div class="value">${name}</div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${phone}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${email}" style="color:#0a1628;">${email}</a></div>
      </div>
      <div class="field">
        <div class="label">Loan Type</div>
        <div class="value"><span class="badge">${loanType}</span></div>
      </div>
      ${message ? `
      <hr class="divider" />
      <div class="field">
        <div class="label">Message</div>
        <div class="value">${message.replace(/\n/g, '<br />')}</div>
      </div>` : ''}
    </div>
    <div class="footer">phuongha.loans — Oregon &amp; Washington Home Loans</div>
  </div>
</body>
</html>
  `.trim();

  const textBody = [
    `New Lead — phuongha.loans`,
    `Submitted: ${timestamp} (Pacific Time)`,
    ``,
    `Name:      ${name}`,
    `Phone:     ${phone}`,
    `Email:     ${email}`,
    `Loan Type: ${loanType}`,
    message ? `\nMessage:\n${message}` : '',
  ].join('\n');

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: RECIPIENT,
      reply_to: email,
      subject: `New Lead — phuongha.loans`,
      html: htmlBody,
      text: textBody,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email.' });
  }
};
