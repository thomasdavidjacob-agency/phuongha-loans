// Signed form token (time trap) + Cloudflare Turnstile, shared by every form route.
// Ported from Diamond Bond / Amore 2026-11-02. Leading underscore = not deployed as a route.

const crypto = require('node:crypto');

const MIN_FILL_MS = 3000;              // humans don't fill a form in under 3s
const MAX_TOKEN_AGE_MS = 24 * 3600e3;  // a tab left open overnight still works

// HMAC key. PREP_SECRET is already set in Vercel and, unlike the Resend key, doesn't
// change when a key is rotated, so open tabs keep working through a rotation.
function signingKey() {
  return process.env.FORM_SIGNING_SECRET || process.env.PREP_SECRET || '';
}

function hmac(value) {
  return crypto.createHmac('sha256', signingKey()).update(value).digest('base64url');
}

function issueFormToken() {
  const ts = String(Date.now());
  return `${ts}.${hmac(ts)}`;
}

// 'ok' | 'too-fast' | 'invalid'
function checkFormToken(token) {
  if (!signingKey()) return 'ok'; // nothing to verify against; other layers still apply
  const [ts, sig] = String(token || '').split('.');
  if (!ts || !sig || !/^\d+$/.test(ts)) return 'invalid';
  const expected = hmac(ts);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return 'invalid';
  const age = Date.now() - Number(ts);
  if (age < MIN_FILL_MS) return 'too-fast';
  if (age > MAX_TOKEN_AGE_MS) return 'invalid';
  return 'ok';
}

async function turnstileOk(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set; Turnstile check skipped');
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: String(token) });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = await r.json();
    if (!data.success) console.warn('Turnstile rejected:', data['error-codes']);
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verify failed:', err.message);
    return false;
  }
}

module.exports = { issueFormToken, checkFormToken, turnstileOk };
