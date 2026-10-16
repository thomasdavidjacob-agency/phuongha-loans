// Shared spam filter for every form endpoint (submit-lead, register-class, register-prep).
// checkSpam() returns null for a clean submission, or { reason, silent, error }.
//   silent: true  → caller answers 200 {ok:true} so the bot gets no signal, and nothing is emailed or relayed.
//   silent: false → caller answers 400 with `error` (a real person may have made a fixable mistake).
// Every block is logged as "spam blocked" so it shows up in Vercel runtime logs for tuning.

const MIN_FILL_MS = 3000;
const RATE_WINDOW = 10 * 60 * 1000;
const RATE_MAX = 5;
const ipLog = new Map();

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamailblock.com', 'grr.la', 'sharklasers.com', 'spam4.me',
  'tempmail.com', 'temp-mail.org', '10minutemail.com', 'throwam.com', 'yopmail.com', 'trashmail.com',
  'fakeinbox.com', 'maildrop.cc', 'getairmail.com', 'dispostable.com', 'discard.email', 'spamgourmet.com',
  'tempr.email', 'mailnesia.com', 'mailnull.com', 'emailondeck.com', 'mohmal.com', 'getnada.com', 'mintemail.com',
];

// Vendor pitches and junk. Word-bounded so "seo" doesn't hit "Seoul"; nothing here appears in a real loan inquiry.
const SPAM_PATTERNS = [
  /\bseo\b/i, /\bbacklinks?\b/i, /\bguest\s*post/i, /\bfirst page of google\b/i, /\branking\b.*\bgoogle\b/i,
  /\bweb\s*(site)?\s*(design|development|redesign)\b/i, /\bdigital marketing\b/i, /\bmarketing (services|agency)\b/i,
  /\blead generation\b/i, /\bincrease (your )?(traffic|sales|leads)\b/i, /\bvirtual assistants?\b/i, /\boutsourc/i,
  /\bappointment setting\b/i, /\bsocial media (management|marketing)\b/i, /\bvideo (explainer|animation)\b/i,
  /\bcasino\b/i, /\bcrypto/i, /\bbitcoin\b/i, /\bforex\b/i, /\bviagra\b/i, /\bcialis\b/i, /\bporn/i, /\bescort/i,
  /\bmake money\b/i, /\bwork from home\b/i, /\bclick here\b/i, /\bfree gift\b/i, /\blimited offer\b/i,
  /\bcongratulations you\b/i, /\bunsubscribe\b/i, /\bopt[ -]?out\b/i,
];

// Messages: only real links count ("email me at joe@gmail.com" or "saw it on Zillow.com" must get through).
// Names: a bare domain is enough, since no person's name contains one.
const LINK_RE = /(https?:\/\/|www\.|\[url|<a\s)/i;
const NAME_URL_RE = /(https?:\/\/|www\.|\[url|<a\s|@|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|info|biz|top|site|online|shop)\b)/i;

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function overRate(ip) {
  const now = Date.now();
  const e = ipLog.get(ip);
  if (!e || now - e.start > RATE_WINDOW) { ipLog.set(ip, { count: 1, start: now }); return false; }
  e.count++;
  return e.count > RATE_MAX;
}

/**
 * @param req   the request (for IP)
 * @param body  the parsed body (reads `website` honeypot and `_t` load timestamp)
 * @param f     { name, email, phone, message } — whichever the form has
 * @param opts  { phoneRequired }
 */
function checkSpam(req, body, f, opts = {}) {
  const ip = clientIp(req);
  const block = (reason, silent = true, error = '') => {
    console.log('spam blocked:', JSON.stringify({ reason, ip, path: req.url, name: f.name, email: f.email }));
    return { reason, silent, error };
  };

  if (overRate(ip)) return block('rate', false, 'Too many requests. Please wait a few minutes and try again.');

  // Honeypot: hidden field only bots fill in.
  if (String(body.website ?? '').trim()) return block('honeypot');

  // Load timestamp is set by the page's script. Missing = a bot posting straight to the API.
  const loaded = parseInt(body._t, 10);
  if (isNaN(loaded)) return block('no-timestamp');
  if (Date.now() - loaded < MIN_FILL_MS) return block('too-fast');

  const name = String(f.name ?? '');
  const email = String(f.email ?? '').toLowerCase();
  const message = String(f.message ?? '');

  const domain = email.split('@')[1] || '';
  if (DISPOSABLE_DOMAINS.includes(domain)) return block('disposable-email', false, 'Please use a personal or work email address.');

  if (NAME_URL_RE.test(name)) return block('link-in-name');
  if (/\d{3,}/.test(name) || name.length > 80) return block('bad-name');
  if (LINK_RE.test(message)) return block('link-in-message');

  const text = `${name}\n${message}`;
  if (SPAM_PATTERNS.some((re) => re.test(text))) return block('spam-phrase');

  if (f.phone !== undefined) {
    const digits = String(f.phone).replace(/\D/g, '');
    const badPhone = digits.length ? digits.length < 10 || digits.length > 15 : opts.phoneRequired;
    if (badPhone) return block('bad-phone', false, 'Please enter a valid phone number, including area code.');
  }

  return null;
}

/** Sends the spam result back. Returns true if the request was handled (caller should stop). */
function rejectSpam(res, hit) {
  if (!hit) return false;
  if (hit.silent) res.status(200).json({ ok: true });
  else res.status(hit.reason === 'rate' ? 429 : 400).json({ error: hit.error });
  return true;
}

module.exports = { checkSpam, rejectSpam, DISPOSABLE_DOMAINS };
