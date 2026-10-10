/* Chat widget: Winston (AI) when Phuong is away, real-time chat when he's live (agent.html),
   a "Talk to Phuong" contact form, and the Get Pre-Approved link. Backed by api/chat.js + api/live.js.
   Self-contained: injects its own styles. Loaded on every page with <script src="chat-widget.js" defer>. */
(function () {
  if (window.__wzChat) return;
  window.__wzChat = true;

  const SOLO = 'https://msf.tidalwave.ai/signup/phuong.ha/D6NDRB536C4Q72PD4OLG';
  const PHOTO = 'phuong-headshot.jpg';
  const NO_REPLY_MS = 120000;   // offer the form if Phuong hasn't answered in 2 minutes
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  // ---------- styles ----------
  const css = `
  .wz-btn{position:fixed;right:20px;bottom:20px;z-index:9998;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;
    background:var(--gold,#C8913A);color:#0D1B2A;box-shadow:0 10px 30px rgba(0,0,0,.45);display:grid;place-items:center;transition:transform .2s,background .2s}
  .wz-btn:hover{background:var(--gold-light,#DBA84F);transform:translateY(-2px)}
  .wz-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}
  .wz-btn svg{width:28px;height:28px}
  .wz-dot{position:absolute;top:3px;right:3px;width:14px;height:14px;border-radius:50%;background:#3DDC84;border:2px solid #0D1B2A;display:none}
  .wz-btn.is-live .wz-dot{display:block}
  .wz-badge{position:absolute;top:-4px;left:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#E5484D;color:#fff;font:600 12px/20px var(--font-display,system-ui);display:none}
  .wz-panel{position:fixed;right:20px;bottom:92px;z-index:9999;width:min(380px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));
    display:none;flex-direction:column;border-radius:1.25rem;overflow:hidden;background:#0F2030;border:1px solid rgba(255,255,255,.12);
    box-shadow:0 24px 64px rgba(0,0,0,.55);font-family:var(--font-display,'Poppins',system-ui,sans-serif);color:#fff}
  .wz-panel.is-open{display:flex}
  .wz-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#0A1622;border-bottom:1px solid rgba(255,255,255,.08)}
  .wz-av{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;background:rgba(200,145,58,.18);color:var(--gold-light,#DBA84F);font-weight:600;overflow:hidden}
  /* photo as a background so the site's global img rules can't change its crop; framed on the face */
  .wz-av--photo{background:url(/${PHOTO}) 50% 78% / 112% auto no-repeat}
  .wz-title{flex:1;min-width:0}
  .wz-title b{display:block;font-size:.95rem;font-weight:600}
  .wz-title span{font-size:.75rem;color:rgba(255,255,255,.6)}
  .wz-title span i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#3DDC84;margin-right:6px;vertical-align:0}
  .wz-x{border:0;background:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:22px;line-height:1;padding:4px 6px;border-radius:8px}
  .wz-x:hover{color:#fff;background:rgba(255,255,255,.08)}
  .wz-note{padding:8px 16px;font-size:.7rem;line-height:1.45;color:rgba(255,255,255,.55);background:rgba(200,145,58,.08);border-bottom:1px solid rgba(255,255,255,.06)}
  .wz-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}
  .wz-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:.88rem;line-height:1.5;word-wrap:break-word}
  .wz-msg p{margin:0 0 6px}.wz-msg p:last-child{margin:0}
  .wz-msg ul{margin:4px 0;padding-left:18px}
  .wz-bot{align-self:flex-start;background:rgba(255,255,255,.07);border-bottom-left-radius:4px}
  .wz-me{align-self:flex-end;background:var(--gold,#C8913A);color:#0D1B2A;border-bottom-right-radius:4px}
  .wz-agent{align-self:flex-start;background:rgba(61,220,132,.12);border:1px solid rgba(61,220,132,.3);border-bottom-left-radius:4px}
  .wz-sys{align-self:center;font-size:.75rem;color:rgba(255,255,255,.55);text-align:center;max-width:95%}
  .wz-who{display:block;font-size:.68rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:3px}
  .wz-src{margin-top:6px;font-size:.72rem;color:rgba(255,255,255,.55)}
  .wz-src a{color:var(--gold-light,#DBA84F);text-decoration:underline;text-underline-offset:2px}
  .wz-typing{display:inline-flex;gap:4px}.wz-typing i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.6);animation:wzb 1s infinite}
  .wz-typing i:nth-child(2){animation-delay:.15s}.wz-typing i:nth-child(3){animation-delay:.3s}
  @keyframes wzb{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .wz-choices{display:flex;flex-direction:column;gap:8px;align-self:stretch}
  .wz-choice{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:#fff;border-radius:12px;padding:11px 14px;text-align:left;cursor:pointer;font:inherit;font-size:.88rem}
  .wz-choice:hover{border-color:var(--gold,#C8913A)}
  .wz-choice b{display:block;font-weight:600}.wz-choice span{font-size:.75rem;color:rgba(255,255,255,.6)}
  .wz-actions{display:flex;gap:8px;padding:10px 12px 0}
  .wz-act{flex:1;border-radius:999px;padding:9px 10px;font:600 .8rem var(--font-display,system-ui);cursor:pointer;text-align:center;text-decoration:none;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff}
  .wz-act:hover{border-color:#fff}
  .wz-act--gold{background:var(--gold,#C8913A);border-color:var(--gold,#C8913A);color:#0D1B2A}
  .wz-act--gold:hover{background:var(--gold-light,#DBA84F)}
  .wz-input{display:flex;gap:8px;padding:10px 12px 12px}
  .wz-input textarea{flex:1;resize:none;height:44px;min-height:0;max-height:120px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#0A1622;color:#fff;font:inherit;font-size:.9rem}
  .wz-input textarea:focus{outline:2px solid var(--gold,#C8913A);outline-offset:0;border-color:transparent}
  .wz-send{width:44px;height:44px;flex:none;border:0;border-radius:12px;background:var(--gold,#C8913A);color:#0D1B2A;cursor:pointer;display:grid;place-items:center}
  .wz-send:disabled{opacity:.5;cursor:default}
  .wz-send svg{width:20px;height:20px}
  .wz-form{display:flex;flex-direction:column;gap:9px;align-self:stretch}
  .wz-form label{font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;flex-direction:column;gap:4px}
  .wz-form input,.wz-form select,.wz-form textarea{padding:9px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0A1622;color:#fff;font:inherit;font-size:.88rem;letter-spacing:0;text-transform:none}
  .wz-form textarea{min-height:70px;resize:vertical}
  .wz-form small{font-size:.7rem;color:rgba(255,255,255,.5);line-height:1.4}
  .wz-form .wz-act{flex:none}
  .wz-legal{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 12px 10px;font-size:.62rem;letter-spacing:.02em;color:rgba(255,255,255,.5);border-top:1px solid rgba(255,255,255,.06)}
  .wz-legal svg{width:14px;height:auto;flex:none}
  .wz-hide{display:none!important}
  @media (max-width:520px){.wz-panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}.wz-btn{right:16px;bottom:16px}}
  @media (prefers-reduced-motion:reduce){.wz-btn,.wz-typing i{transition:none;animation:none}}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- markup ----------
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
  const btn = document.createElement('button');
  btn.className = 'wz-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Chat with Phuong Ha Loans');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = icon + '<span class="wz-dot" aria-hidden="true"></span><span class="wz-badge" aria-hidden="true"></span>';

  const panel = document.createElement('div');
  panel.className = 'wz-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat');
  panel.innerHTML = `
    <div class="wz-head">
      <div class="wz-av">W</div>
      <div class="wz-title"><b>Winston</b><span>AI mortgage assistant</span></div>
      <button class="wz-x" type="button" aria-label="Close chat">&times;</button>
    </div>
    <div class="wz-note">Winston is an AI assistant for general information only, not a loan offer or approval. Please don't share Social Security or account numbers in chat.</div>
    <div class="wz-body" aria-live="polite"></div>
    <div class="wz-actions">
      <button class="wz-act" type="button" data-act="talk">Talk to Phuong</button>
      <a class="wz-act wz-act--gold" href="${SOLO}" target="_blank" rel="noopener">Get Pre-Approved</a>
    </div>
    <form class="wz-input">
      <textarea rows="1" placeholder="Ask about FHA, VA, USDA…" aria-label="Your message" maxlength="1500"></textarea>
      <button class="wz-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
    </form>
    <div class="wz-legal">
      <svg viewBox="0 0 200 160" role="img" aria-label="Equal Housing Lender" fill="currentColor"><path fill-rule="evenodd" d="M100,2 L198,80 L198,160 L2,160 L2,80 L100,2 Z M100,22 L183,82 L183,148 L17,148 L17,82 L100,22 Z"/><rect x="42" y="90" width="116" height="18" rx="1"/><rect x="42" y="120" width="116" height="18" rx="1"/></svg>
      <span>Equal Housing Lender · Mortgage Solutions Financial NMLS #61602</span>
    </div>`;
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const $ = (s) => panel.querySelector(s);
  const body = $('.wz-body');
  const input = $('.wz-input textarea');
  const sendBtn = $('.wz-send');
  const inputForm = $('.wz-input');
  const badge = btn.querySelector('.wz-badge');

  // ---------- state ----------
  let live = false;
  let available = false;
  let mode = store.get('wz-mode') || 'ai';           // 'ai' | 'live' | 'form'
  let aiHistory = store.get('wz-ai') || [];
  let liveId = store.get('wz-live-id');
  let liveCount = store.get('wz-live-count') || 0;
  let liveLog = store.get('wz-live-log') || [];
  let pollTimer = null;
  let lastAgentAt = 0;
  let waitTimer = null;
  let unread = 0;
  let busy = false;

  // ---------- rendering ----------
  function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  // Light formatting for AI replies: paragraphs, "- " bullets, **bold**. Everything escaped first.
  function fmt(text) {
    const blocks = esc(text).split(/\n{2,}/);
    return blocks.map((b) => {
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
        return '<ul>' + lines.map((l) => '<li>' + l.replace(/^\s*[-*•]\s+/, '') + '</li>').join('') + '</ul>';
      }
      return '<p>' + lines.join('<br>') + '</p>';
    }).join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function bubble(kind, html, who) {
    const d = document.createElement('div');
    d.className = 'wz-msg ' + kind;
    d.innerHTML = (who ? `<span class="wz-who">${esc(who)}</span>` : '') + html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  function sys(text) {
    const d = document.createElement('div');
    d.className = 'wz-sys';
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  function typing() { return bubble('wz-bot', '<span class="wz-typing"><i></i><i></i><i></i></span>'); }
  function sourcesHtml(sources) {
    const safe = (sources || []).filter((s) => /^https:\/\//.test(s.url));
    if (!safe.length) return '';
    return '<div class="wz-src">Sources: ' + safe.map((s, i) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || 'source ' + (i + 1))}</a>`).join(' · ') + '</div>';
  }

  function setHeader() {
    const av = $('.wz-av');
    const title = $('.wz-title');
    if (mode === 'live' || mode === 'form') {
      av.textContent = '';
      av.classList.add('wz-av--photo');
      const status = mode === 'form' ? 'Send a message' : (live ? '<i></i>Online now' : 'Away');
      title.innerHTML = '<b>Phuong Ha</b><span>' + status + ' · NMLS #1839449</span>';
    } else {
      av.classList.remove('wz-av--photo');
      av.textContent = 'W';
      title.innerHTML = '<b>Winston</b><span>AI mortgage assistant' + (live ? ' · <i></i>Phuong is online' : '') + '</span>';
    }
    btn.classList.toggle('is-live', live);
  }

  function renderAI() {
    body.innerHTML = '';
    bubble('wz-bot', fmt("Hi, I'm Winston, Phuong's AI assistant. Ask me how FHA, VA, USDA and other government-backed loans work, or about the home buying process. For anything specific to you, tap **Talk to Phuong**."), 'Winston');
    if (live) offerLive();
    aiHistory.forEach((m) => {
      if (m.role === 'user') bubble('wz-me', fmt(m.content));
      else bubble('wz-bot', fmt(m.content) + sourcesHtml(m.sources), 'Winston');
    });
    input.placeholder = 'Ask about FHA, VA, USDA…';
    inputForm.classList.remove('wz-hide');
  }

  function offerLive() {
    const wrap = document.createElement('div');
    wrap.className = 'wz-choices';
    wrap.innerHTML = '<button class="wz-choice" type="button"><b>Phuong is online. Chat with him live</b><span>Real person, real-time answers</span></button>';
    wrap.querySelector('button').addEventListener('click', () => setMode('live'));
    body.appendChild(wrap);
  }

  function renderLive() {
    body.innerHTML = '';
    if (!liveId) {
      sys(live ? "You're chatting with Phuong. He'll reply right here." : 'Phuong is away right now.');
      if (!live) { offerForm('Leave your details and he will get back to you.'); inputForm.classList.add('wz-hide'); return; }
      const nameRow = document.createElement('div');
      nameRow.className = 'wz-form';
      nameRow.innerHTML = '<label>Your first name (optional)<input type="text" maxlength="60" autocomplete="given-name"></label>';
      body.appendChild(nameRow);
    }
    liveLog.forEach(showLiveMsg);
    input.placeholder = 'Message Phuong…';
    inputForm.classList.remove('wz-hide');
  }
  function showLiveMsg(m) {
    if (m.from === 'visitor') bubble('wz-me', fmt(m.text));
    else if (m.from === 'agent') bubble('wz-agent', fmt(m.text), 'Phuong');
    else sys(m.text);
  }

  function offerForm(lead) {
    const wrap = document.createElement('div');
    wrap.className = 'wz-choices';
    wrap.innerHTML = `<button class="wz-choice" type="button"><b>Send Phuong a message</b><span>${esc(lead)}</span></button>`;
    wrap.querySelector('button').addEventListener('click', () => setMode('form'));
    body.appendChild(wrap);
  }

  function renderForm() {
    body.innerHTML = '';
    inputForm.classList.add('wz-hide');
    sys('Phuong will reach out personally, usually within one business day.');
    const f = document.createElement('form');
    f.className = 'wz-form';
    f.innerHTML = `
      <label>Name<input name="name" required maxlength="100" autocomplete="name"></label>
      <label>Phone<input name="phone" required maxlength="30" type="tel" autocomplete="tel"></label>
      <label>Email<input name="email" required maxlength="120" type="email" autocomplete="email"></label>
      <label>Topic<select name="loanType" required>
        <option value="" disabled selected>Select…</option>
        <option>Purchase</option><option>Refinance</option><option>FHA</option><option>VA</option>
        <option>USDA</option><option>Down Payment Assistance</option><option>Not Sure</option></select></label>
      <label>How can Phuong help?<textarea name="message" maxlength="1000"></textarea></label>
      <small>Please don't include Social Security, bank, or account numbers. Phuong will collect anything sensitive securely.</small>
      <button class="wz-act wz-act--gold" type="submit">Send to Phuong</button>
      <button class="wz-act" type="button" data-back>Back to chat</button>`;
    f.querySelector('[data-back]').addEventListener('click', () => setMode(liveId ? 'live' : 'ai'));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f));
      if (liveId || aiHistory.length) data.message = (data.message ? data.message + '\n\n' : '') + '(Sent from the website chat.)';
      const submit = f.querySelector('[type=submit]');
      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        const r = await fetch('/api/submit-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Send failed');
        body.innerHTML = '';
        sys('Thanks! Phuong has your message and will reach out soon.');
        bubble('wz-bot', fmt("While you wait, you can start your secure application anytime with **Get Pre-Approved** below."), 'Winston');
      } catch (err) {
        submit.disabled = false;
        submit.textContent = 'Send to Phuong';
        sys("That didn't go through. Please try again, or call or text Phuong.");
      }
    });
    body.appendChild(f);
  }

  function render() {
    setHeader();
    if (mode === 'live') renderLive();
    else if (mode === 'form') renderForm();
    else renderAI();
  }
  function setMode(m) {
    mode = m;
    store.set('wz-mode', m);
    render();
    if (m === 'live' && liveId) startPolling();
    if (m !== 'form') input.focus();
  }

  // ---------- AI ----------
  async function sendAI(text) {
    aiHistory.push({ role: 'user', content: text });
    bubble('wz-me', fmt(text));
    const t = typing();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiHistory.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await r.json().catch(() => ({}));
      t.remove();
      if (!r.ok) throw new Error(data.error || 'Winston is unavailable.');
      aiHistory.push({ role: 'assistant', content: data.reply, sources: data.sources });
      store.set('wz-ai', aiHistory.slice(-16));
      bubble('wz-bot', fmt(data.reply) + sourcesHtml(data.sources), 'Winston');
    } catch (err) {
      t.remove();
      aiHistory.pop();
      sys(err.message || 'Winston is unavailable. Tap Talk to Phuong.');
    }
  }

  // ---------- live ----------
  async function sendLive(text) {
    if (!liveId) {
      const nameInput = body.querySelector('.wz-form input');
      const name = nameInput ? nameInput.value.trim() : '';
      const r = await fetch('/api/live', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', name, text, page: location.pathname }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        sys(data.error || "Couldn't reach Phuong.");
        offerForm('Leave your details and he will get back to you.');
        return;
      }
      liveId = data.id;
      store.set('wz-live-id', liveId);
      if (nameInput) nameInput.closest('.wz-form').remove();
      armWaitTimer();
      startPolling();
      return;
    }
    const r = await fetch('/api/live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', id: liveId, text }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      sys(data.error || "That didn't send.");
      if (r.status === 410) endLive();
    }
  }
  function armWaitTimer() {
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      if (Date.now() - lastAgentAt > NO_REPLY_MS && mode === 'live') {
        sys("Phuong may be with a client. You can keep waiting, or leave your details and he'll get back to you.");
        offerForm('He will reply by phone or email.');
      }
    }, NO_REPLY_MS);
  }
  function endLive() {
    stopPolling();
    liveId = null;
    liveCount = 0;
    liveLog = [];
    ['wz-live-id', 'wz-live-count', 'wz-live-log'].forEach((k) => store.set(k, null));
  }
  async function poll() {
    if (!liveId) return;
    try {
      const r = await fetch(`/api/live?action=poll&id=${encodeURIComponent(liveId)}&after=${liveCount}`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      for (const m of data.messages) {
        liveCount++;
        liveLog.push(m);
        if (m.from === 'agent') { lastAgentAt = Date.now(); clearTimeout(waitTimer); }
        if (m.from === 'visitor') continue;   // the visitor's own messages are drawn when typed
        if (mode === 'live' && panel.classList.contains('is-open')) showLiveMsg(m);
        else if (m.from === 'agent') { unread++; badge.textContent = unread; badge.style.display = 'block'; }
      }
      store.set('wz-live-count', liveCount);
      store.set('wz-live-log', liveLog.slice(-60));
      if (live !== data.live) { live = data.live; setHeader(); }
      if (data.closed) {
        endLive();
        if (mode === 'live') { sys('This chat has ended. Winston can still help with general questions.'); }
      }
    } catch (e) { /* network blip; next poll retries */ }
  }
  function startPolling() {
    stopPolling();
    poll();
    pollTimer = setInterval(poll, panel.classList.contains('is-open') ? 3000 : 10000);
  }
  function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

  // ---------- status ----------
  async function refreshStatus() {
    try {
      const r = await fetch('/api/live?action=status', { cache: 'no-store' });
      const data = await r.json();
      available = data.available;
      const was = live;
      live = Boolean(data.live);
      setHeader();
      if (was !== live && panel.classList.contains('is-open') && !busy) render();
    } catch (e) { live = false; }
  }

  // ---------- events ----------
  function open() {
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    unread = 0;
    badge.style.display = 'none';
    refreshStatus().then(render);
    if (liveId) startPolling();
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (liveId) startPolling();   // slower background polling keeps the badge working
    btn.focus();
  }
  btn.addEventListener('click', () => (panel.classList.contains('is-open') ? close() : open()));
  $('.wz-x').addEventListener('click', close);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('[data-act="talk"]').addEventListener('click', () => setMode(live || liveId ? 'live' : 'form'));

  inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    busy = true;
    sendBtn.disabled = true;
    try {
      if (mode === 'live') {
        bubble('wz-me', fmt(text));   // shown now; poll() logs it without drawing it twice
        await sendLive(text);
      } else {
        await sendAI(text);
      }
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inputForm.requestSubmit(); }
  });

  refreshStatus();
  setInterval(refreshStatus, 60000);
  if (liveId) startPolling();
})();
