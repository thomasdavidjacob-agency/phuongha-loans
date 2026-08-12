const { Resend } = require('resend');
const crypto = require('crypto');

const FROM_ADDRESS = 'leads@phuongha.loans';
const NOTIFY_RECIPIENTS = ['phuonghaloans@gmail.com', 'phuong.ha@mortgagesolutions.net'];

const RATE_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 3;
const ipLog = new Map();

const BLOCKED_DOMAINS = [
  'mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','throwam.com',
  'yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la','spam4.me',
  'trashmail.com','fakeinbox.com','maildrop.cc','getairmail.com','dispostable.com',
  'discard.email','spamgourmet.com','tempr.email','mailnesia.com','mailnull.com',
];

const SPAM_PHRASES = [
  'buy cheap','seo ','casino','crypto','bitcoin','make money','work from home',
  'click here','free gift','limited offer','congratulations you',
];

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

function checkRate(ip) {
  const now = Date.now();
  const entry = ipLog.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) { ipLog.set(ip, { count: 1, start: now }); return true; }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  ipLog.set(ip, entry);
  return true;
}

function createToken(email) {
  const secret = process.env.PREP_SECRET || 'phuongha-prep-default-2026';
  const ts = Date.now().toString();
  const payload = `${email}:${ts}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
  }

  const body = req.body || {};
  const name   = String(body.name  ?? '').trim().slice(0, 200);
  const email  = String(body.email ?? '').trim().toLowerCase().slice(0, 200);
  const phone  = String(body.phone ?? '').trim().slice(0, 40);
  const honey  = String(body.website ?? '');
  const _t     = String(body._t ?? '');

  // Honeypot — bots fill this field
  if (honey) return res.status(200).json({ ok: true }); // silent accept

  // Timing check — must have had form open at least 3 seconds
  const loadTime = parseInt(_t, 10);
  if (!isNaN(loadTime) && Date.now() - loadTime < 3000) {
    return res.status(200).json({ ok: true }); // silent accept
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const domain = email.split('@')[1] || '';
  if (BLOCKED_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: 'Please use a personal or business email address.' });
  }

  // Spam keyword check in name field
  const nameLower = name.toLowerCase();
  if (SPAM_PHRASES.some(p => nameLower.includes(p))) {
    return res.status(200).json({ ok: true }); // silent accept
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const token = createToken(email);
  const confirmUrl = `https://phuongha.loans/api/confirm-prep?token=${token}`;
  const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' });

  // Confirmation email to the registrant
  const confirmHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <div style="max-width:520px;margin:32px auto;background:#0a1628;border-radius:12px;overflow:hidden;">
    <div style="padding:32px 32px 0;">
      <div style="font-family:'Georgia',serif;font-size:1.2rem;color:#c9a84c;margin-bottom:20px;">PhuongHa.Loans</div>
      <h1 style="color:#ffffff;font-size:1.4rem;line-height:1.3;margin-bottom:14px;">Confirm your email to unlock the NMLS exam prep</h1>
      <p style="color:#8a9ab5;font-size:0.9rem;line-height:1.6;margin-bottom:24px;">Hi ${esc(name)},<br><br>You're one click away from full access to 200 NMLS SAFE Act practice questions. Click the button below to confirm your email and unlock everything.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#c9a84c;color:#0a1628;font-weight:700;font-size:0.95rem;padding:14px 32px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Confirm Email &amp; Unlock Access →</a>
      <p style="color:#8a9ab5;font-size:0.78rem;line-height:1.6;margin-bottom:24px;">This link expires in 24 hours. If you didn't request this, you can safely ignore it.</p>
    </div>
    <div style="background:#091220;padding:20px 32px;font-size:0.72rem;color:#4a5a6a;">
      Phuong Ha · NMLS #1839449 · <a href="https://phuongha.loans" style="color:#c9a84c;">phuongha.loans</a>
    </div>
  </div>
</body></html>`;

  // Internal notification to Phuong
  const notifyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
    <div style="background:#0a1628;padding:24px 28px;">
      <h1 style="color:#c9a84c;font-size:1.1rem;margin:0;">New NMLS Prep Registration</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:0.8rem;margin:6px 0 0;">${ts} (Pacific)</p>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="font-size:0.7rem;text-transform:uppercase;color:#888;padding:4px 0 2px;">Name</td></tr>
        <tr><td style="font-size:0.95rem;color:#111;padding-bottom:14px;">${esc(name)}</td></tr>
        <tr><td style="font-size:0.7rem;text-transform:uppercase;color:#888;padding:4px 0 2px;">Email</td></tr>
        <tr><td style="font-size:0.95rem;color:#111;padding-bottom:14px;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        ${phone ? `<tr><td style="font-size:0.7rem;text-transform:uppercase;color:#888;padding:4px 0 2px;">Phone</td></tr>
        <tr><td style="font-size:0.95rem;color:#111;padding-bottom:14px;">${esc(phone)}</td></tr>` : ''}
      </table>
      <p style="font-size:0.8rem;color:#888;">Confirmation email sent. They must click the link before access is granted.</p>
    </div>
    <div style="background:#f9f9f9;padding:14px 28px;font-size:0.72rem;color:#aaa;text-align:center;">phuongha.loans — NMLS Exam Prep</div>
  </div>
</body></html>`;

  try {
    await Promise.all([
      resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: 'Confirm your email — NMLS Exam Prep access',
        html: confirmHtml,
        text: `Hi ${name},\n\nConfirm your email to unlock 200 NMLS SAFE Act practice questions:\n\n${confirmUrl}\n\nThis link expires in 24 hours.\n\n— Phuong Ha, NMLS #1839449`,
      }),
      resend.emails.send({
        from: FROM_ADDRESS,
        to: NOTIFY_RECIPIENTS,
        reply_to: email,
        subject: `NMLS Prep signup — ${name}`,
        html: notifyHtml,
        text: `New NMLS Prep Registration\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'not provided'}\nTime: ${ts} (Pacific)\n\nConfirmation email sent.`,
      }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email. Please try again or call (971) 444-9107.' });
  }
};
