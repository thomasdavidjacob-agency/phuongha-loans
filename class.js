/* Oregon Home Buyer School — registration form (class.html). Dates come from /api/register-class. */
(function () {
  const form = document.getElementById('class-form');
  if (!form) return;
  const datesEl = document.getElementById('class-dates');
  const btn = document.getElementById('class-submit');
  const result = document.getElementById('class-result');
  const loadedAt = Date.now();
  const params = new URLSearchParams(location.search);
  const QUIZ_KEYS = ['owned_recently', 'income_band', 'veteran', 'timeline', 'savings', 'took_quiz', 'utm_source', 'utm_campaign', 'heard_from'];

  if (params.get('county')) form.county.value = params.get('county');
  if (params.get('took_quiz')) {
    const q = document.getElementById('class-success-quiz');
    if (q) q.hidden = true;
  }

  function showError(msg) {
    result.textContent = msg;
    result.className = 'form__result error';
  }

  fetch('/api/register-class')
    .then((r) => r.json())
    .then(({ sessions }) => {
      if (!sessions || !sessions.length) {
        datesEl.innerHTML = '<p class="cls-fine">No dates are open right now. Call or text 971-444-9107 and I will save you a seat for the next one.</p>';
        return;
      }
      datesEl.innerHTML = sessions
        .map((s, i) => `<label class="cls-date"><input type="radio" name="session" value="${s.iso}" ${i === 0 ? 'checked' : ''} /><span><b>${s.day}</b><small>${s.time} Pacific · 60 minutes on Zoom</small></span></label>`)
        .join('');
    })
    .catch(() => {
      datesEl.innerHTML = '<p class="cls-fine">Could not load class dates. Please refresh, or call or text 971-444-9107.</p>';
    });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    result.className = 'form__result';
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.session) return showError('Please pick a class date.');
    if (!data.first_name.trim()) return showError('Please enter your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) return showError('Please enter a valid email address.');
    QUIZ_KEYS.forEach((k) => params.get(k) && (data[k] = params.get(k)));
    data._t = String(loadedAt);

    btn.classList.add('loading');
    btn.disabled = true;
    try {
      const res = await fetch('/api/register-class', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Something went wrong. Please try again.');
      form.hidden = true;
      document.getElementById('class-success-when').textContent = out.session ? `See you ${out.session}.` : '';
      document.getElementById('class-success').hidden = false;
      document.getElementById('register').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      showError(err.message);
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
})();

(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
