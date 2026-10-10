// Live chat with Phuong + the Live/Away switch, for chat-widget.js (visitors) and agent.html (Phuong).
// Storage: Upstash Redis via _store.js. Without it, status reports available:false and the widget
// runs Winston (AI) + the contact form only.
// Env: AGENT_PASSWORD (agent console login), RESEND_API_KEY (new-chat email alert).
const crypto = require('crypto');
const { Resend } = require('resend');
const store = require('./_store.js');

const TTL = 7 * 24 * 3600;           // chats are kept 7 days, then expire
const BEAT_SEC = 90;                 // "live" lapses if the console hasn't pinged for this long
const ALERT_TO = ['phuonghaloans@gmail.com', 'phuong.ha@mortgagesolutions.net'];
const CONSOLE_URL = 'https://phuongha.loans/agent.html';

const clean = (s, max = 1000) => (typeof s === 'string' ? s.replace(/[<>]/g, '').trim().slice(0, max) : '');
const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{20,40}$/.test(id);

function isAgent(req) {
  const want = process.env.AGENT_PASSWORD;
  const got = req.headers['x-agent-key'];
  if (!want || typeof got !== 'string') return false;
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

async function liveNow() {
  const [on, beat] = await store.pipeline([['GET', 'live:on'], ['GET', 'live:beat']]);
  return on === '1' && Boolean(beat);
}

async function addMessage(id, from, text) {
  const msg = JSON.stringify({ from, text, at: Date.now() });
  const now = Date.now();
  await store.pipeline([
    ['RPUSH', `chat:${id}:msgs`, msg],
    ['EXPIRE', `chat:${id}:msgs`, TTL],
    ['HSET', `chat:${id}:meta`, 'last', now, 'lastFrom', from],
    ['EXPIRE', `chat:${id}:meta`, TTL],
    ['ZADD', 'chats', now, id],
  ]);
}

async function readMessages(id, after) {
  const [raw, meta] = await store.pipeline([
    ['LRANGE', `chat:${id}:msgs`, Math.max(0, after), -1],
    ['HGETALL', `chat:${id}:meta`],
  ]);
  const m = {};
  for (let i = 0; i < (meta || []).length; i += 2) m[meta[i]] = meta[i + 1];
  return { messages: (raw || []).map((s) => JSON.parse(s)), meta: m };
}

async function alertPhuong(name, text) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'leads@phuongha.loans',
      to: ALERT_TO,
      subject: `Live chat waiting: ${name || 'a visitor'}`,
      text: `${name || 'A visitor'} started a live chat on phuongha.loans:\n\n"${text}"\n\nAnswer it here: ${CONSOLE_URL}`,
    });
  } catch (e) {
    console.error('chat alert email failed:', e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.method === 'GET' ? req.query || {} : req.body || {};
  const action = q.action;

  if (action === 'status') {
    if (!store.configured) return res.json({ available: false, live: false });
    try { return res.json({ available: true, live: await liveNow() }); }
    catch (e) { console.error(e.message); return res.json({ available: false, live: false }); }
  }

  if (!store.configured) return res.status(503).json({ error: 'Live chat is not set up.' });
  const ip = store.clientIp(req);

  try {
    // ---------- visitor ----------
    if (action === 'start' && req.method === 'POST') {
      if (!(await store.underLimit(`rl:start:${ip}`, 5, 3600))) return res.status(429).json({ error: 'Too many chats. Please use the contact form.' });
      if (!(await liveNow())) return res.status(409).json({ error: 'Phuong just stepped away.' });
      const name = clean(q.name, 60);
      const text = clean(q.text);
      if (!text) return res.status(400).json({ error: 'Type a message first.' });
      const id = crypto.randomBytes(18).toString('base64url');
      await store.pipeline([
        ['HSET', `chat:${id}:meta`, 'name', name || 'Visitor', 'created', Date.now(), 'status', 'open', 'page', clean(q.page, 200)],
        ['EXPIRE', `chat:${id}:meta`, TTL],
      ]);
      await addMessage(id, 'visitor', text);
      await alertPhuong(name, text);
      return res.json({ id });
    }
    if (action === 'send' && req.method === 'POST') {
      if (!validId(q.id)) return res.status(400).json({ error: 'Bad chat.' });
      if (!(await store.underLimit(`rl:send:${ip}`, 40, 600))) return res.status(429).json({ error: 'Slow down a little.' });
      const text = clean(q.text);
      if (!text) return res.status(400).json({ error: 'Empty message.' });
      const status = await store.cmd('HGET', `chat:${q.id}:meta`, 'status');
      if (status !== 'open') return res.status(410).json({ error: 'This chat has ended.' });
      await addMessage(q.id, 'visitor', text);
      return res.json({ ok: true });
    }
    if (action === 'poll') {
      if (!validId(q.id)) return res.status(400).json({ error: 'Bad chat.' });
      const { messages, meta } = await readMessages(q.id, Number(q.after) || 0);
      return res.json({ messages, closed: meta.status !== 'open', live: await liveNow() });
    }

    // ---------- agent (Phuong) ----------
    if (!isAgent(req)) return res.status(401).json({ error: 'Not signed in.' });

    if (action === 'setLive') {
      const on = q.live === true || q.live === 'true';
      await store.pipeline(on
        ? [['SET', 'live:on', '1'], ['SET', 'live:beat', Date.now(), 'EX', BEAT_SEC]]
        : [['SET', 'live:on', '0'], ['DEL', 'live:beat']]);
      return res.json({ live: on });
    }
    if (action === 'heartbeat') {
      const on = await store.cmd('GET', 'live:on');
      if (on === '1') await store.cmd('SET', 'live:beat', Date.now(), 'EX', BEAT_SEC);
      return res.json({ live: on === '1' });
    }
    if (action === 'list') {
      const since = Date.now() - TTL * 1000;
      const ids = (await store.cmd('ZRANGE', 'chats', '+inf', since, 'BYSCORE', 'REV', 'LIMIT', 0, 30)) || [];
      const metas = ids.length ? await store.pipeline(ids.map((id) => ['HGETALL', `chat:${id}:meta`])) : [];
      const chats = ids.map((id, i) => {
        const m = {};
        const arr = metas[i] || [];
        for (let j = 0; j < arr.length; j += 2) m[arr[j]] = arr[j + 1];
        return { id, ...m };
      }).filter((c) => c.status);
      const [on, beat] = await store.pipeline([['GET', 'live:on'], ['GET', 'live:beat']]);
      return res.json({ chats, live: on === '1' && Boolean(beat) });
    }
    if (action === 'read') {
      if (!validId(q.id)) return res.status(400).json({ error: 'Bad chat.' });
      return res.json(await readMessages(q.id, Number(q.after) || 0));
    }
    if (action === 'reply' && req.method === 'POST') {
      if (!validId(q.id)) return res.status(400).json({ error: 'Bad chat.' });
      const text = clean(q.text, 2000);
      if (!text) return res.status(400).json({ error: 'Empty message.' });
      await addMessage(q.id, 'agent', text);
      return res.json({ ok: true });
    }
    if (action === 'close' && req.method === 'POST') {
      if (!validId(q.id)) return res.status(400).json({ error: 'Bad chat.' });
      await store.cmd('HSET', `chat:${q.id}:meta`, 'status', 'closed');
      await addMessage(q.id, 'system', 'Phuong ended the chat.');
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    console.error('live chat error:', e.message);
    return res.status(500).json({ error: 'Chat hit a snag. Please use the contact form.' });
  }
};
