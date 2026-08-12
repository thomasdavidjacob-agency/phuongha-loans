const crypto = require('crypto');

function verifyToken(token) {
  try {
    const secret = process.env.PREP_SECRET || 'phuongha-prep-default-2026';
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    // Format: email:timestamp:signature
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return null;
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expected) return null;
    const tsStart = payload.lastIndexOf(':');
    if (tsStart === -1) return null;
    const email = payload.slice(0, tsStart);
    const ts = parseInt(payload.slice(tsStart + 1), 10);
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return null; // expired
    return email;
  } catch (e) {
    return null;
  }
}

module.exports = function handler(req, res) {
  const token = String(req.query.token || '');
  const email = token ? verifyToken(token) : null;

  if (!email) {
    return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link Expired — PhuongHa.Loans</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#0a1628;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
.card{max-width:480px;background:#112240;border:1px solid #1e3a5a;border-radius:16px;padding:44px 36px}
h1{font-size:1.5rem;margin-bottom:12px;line-height:1.3}p{color:#8a9ab5;font-size:0.9rem;line-height:1.7;margin-bottom:24px}
a{display:inline-block;background:#c9a84c;color:#0a1628;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:0.9rem}</style></head>
<body><div class="card"><div style="font-size:2.5rem;margin-bottom:16px;">⏰</div>
<h1>This link has expired.</h1><p>Confirmation links are valid for 24 hours. Please return to the exam prep page and request access again.</p>
<a href="/prep">Back to Exam Prep</a></div></body></html>`);
  }

  // Valid token — return HTML that sets localStorage and redirects
  const safeEmail = email.replace(/[<>"']/g, '');
  return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Access Confirmed — PhuongHa.Loans</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#0a1628;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
.card{max-width:480px;background:#112240;border:1px solid #c9a84c;border-radius:16px;padding:44px 36px}
h1{font-size:1.5rem;margin-bottom:12px;line-height:1.3;color:#c9a84c}p{color:#8a9ab5;font-size:0.9rem;line-height:1.7;margin-bottom:6px}
.sub{color:#4a5a6a;font-size:0.78rem;margin-bottom:28px}
a{display:inline-block;background:#c9a84c;color:#0a1628;font-weight:700;padding:13px 32px;border-radius:8px;text-decoration:none;font-size:0.92rem}
.spin{display:inline-block;margin-bottom:20px;font-size:2.8rem}</style></head>
<body>
<div class="card">
  <div class="spin">🔓</div>
  <h1>You're Unlocked.</h1>
  <p>Full access to all 200 NMLS SAFE Act practice questions is now active.</p>
  <p class="sub">${safeEmail}</p>
  <a href="/prep" id="go-btn">Start the Full Exam &rarr;</a>
</div>
<script>
try {
  localStorage.setItem('nmls_full_access', 'true');
  localStorage.setItem('nmls_email', ${JSON.stringify(safeEmail)});
} catch(e) {}
// Auto-redirect after 3 seconds
setTimeout(function(){ window.location.href = '/prep'; }, 3000);
</script>
</body></html>`);
};
