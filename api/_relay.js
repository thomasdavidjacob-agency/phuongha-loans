// Hands a website lead to the Winston's World Wide relay so it lands in the local CRM.
// Never throws and never takes longer than 4s — the relay must not be able to break a form.
// Env: WWW_RELAY_URL (e.g. https://www-relay.vercel.app), WWW_SITE_TOKEN (the relay's SITE_TOKEN).
async function sendToRelay(lead) {
  const url = process.env.WWW_RELAY_URL;
  const token = process.env.WWW_SITE_TOKEN;
  if (!url || !token) return { skipped: 'relay not configured' };
  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/api/lead', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(4000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error('relay error:', e.message);
    return { ok: false, error: e.message };
  }
}
module.exports = { sendToRelay };
