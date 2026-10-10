// Tiny Upstash Redis REST client for the chat widget (live status, live chats, rate limits).
// Env (set by the Vercel Marketplace Upstash integration): KV_REST_API_URL + KV_REST_API_TOKEN,
// or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. Without them, live chat is simply off.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = Boolean(URL_ && TOKEN);

// Runs several commands in one round trip. Each command is an array, e.g. ['SET', 'k', 'v'].
async function pipeline(commands) {
  if (!configured) throw new Error('store not configured');
  const res = await fetch(URL_.replace(/\/+$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`store HTTP ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

async function cmd(...args) {
  const [result] = await pipeline([args]);
  return result;
}

// Fixed-window counter. Returns true while under `limit` per `windowSec`. Fails open.
async function underLimit(key, limit, windowSec) {
  if (!configured) return true;
  try {
    const [count] = await pipeline([['INCR', key], ['EXPIRE', key, windowSec, 'NX']]);
    return count <= limit;
  } catch (e) {
    console.error('rate limit store error:', e.message);
    return true;
  }
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.socket?.remoteAddress || 'unknown';
}

module.exports = { configured, pipeline, cmd, underLimit, clientIp };
