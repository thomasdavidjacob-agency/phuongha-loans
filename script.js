/* ============================================================
   TOP MENU — active link scroll-spy
   ============================================================ */
(function () {
  const links = Array.from(document.querySelectorAll('.topbar__links a[data-spy]'));
  if (!links.length) return;

  const map = {};
  links.forEach((a) => { map[a.getAttribute('data-spy')] = a; });
  const sections = Object.keys(map)
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!sections.length) return;

  function setActive(id) {
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('data-spy') === id));
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
})();


/* ============================================================
   HERO VIDEO LIGHTBOX
   ============================================================ */
(function () {
  const openBtn  = document.getElementById('video-open');
  const lb       = document.getElementById('vlightbox');
  const closeBtn = document.getElementById('vlightbox-close');
  const backdrop = document.getElementById('vlightbox-backdrop');
  const video    = document.getElementById('hero-video');
  if (!openBtn || !lb) return;

  let lastFocus = null;

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const focusables = [closeBtn, video].filter(Boolean);
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function open() {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
    if (video && typeof video.play === 'function') {
      // user gesture → allowed to play with sound
      video.play().catch(function () {});
    }
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (video) { try { video.pause(); video.currentTime = 0; } catch (e) {} }
    lb.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    const restore = (lastFocus && lastFocus !== document.body) ? lastFocus : openBtn;
    if (restore && typeof restore.focus === 'function') restore.focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
})();


/* ============================================================
   FOOTER YEAR
   ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();


/* ============================================================
   FADE-IN ON SCROLL
   ============================================================ */
(function () {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
})();


/* ============================================================
   LEAD FORM
   ============================================================ */
(function () {
  const form      = document.getElementById('lead-form');
  const submitBtn = document.getElementById('submit-btn');
  const resultEl  = document.getElementById('form-result');

  if (!form) return;

  function setError(fieldName, msg) {
    const field = form.elements[fieldName];
    const errEl = document.getElementById(fieldName + '-error');
    if (field) field.classList.toggle('error', !!msg);
    if (errEl) errEl.textContent = msg || '';
  }

  function clearErrors() {
    ['name', 'phone', 'email', 'loanType'].forEach((f) => setError(f, ''));
    resultEl.className = 'form__result';
    resultEl.textContent = '';
  }

  function validate(data) {
    let valid = true;

    if (!data.name.trim()) {
      setError('name', 'Please enter your full name.');
      valid = false;
    }

    if (!data.phone.trim()) {
      setError('phone', 'Please enter your phone number.');
      valid = false;
    } else if (!/^[\d\s\-\+\(\)\.]{7,20}$/.test(data.phone.trim())) {
      setError('phone', 'Please enter a valid phone number.');
      valid = false;
    }

    if (!data.email.trim()) {
      setError('email', 'Please enter your email address.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      setError('email', 'Please enter a valid email address.');
      valid = false;
    }

    if (!data.loanType) {
      setError('loanType', 'Please select a loan type.');
      valid = false;
    }

    return valid;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();

    const data = {
      name:     form.elements['name'].value,
      phone:    form.elements['phone'].value,
      email:    form.elements['email'].value,
      loanType: form.elements['loanType'].value,
      message:  form.elements['message'].value,
    };

    if (!validate(data)) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        resultEl.textContent = "Thanks! We'll be in touch within 24 hours.";
        resultEl.className = 'form__result success';
        form.reset();
      } else {
        throw new Error(json.error || 'Server error');
      }
    } catch (err) {
      resultEl.textContent =
        'Something went wrong. Please call or text 971-444-9107, or email phuong.ha@mortgagesolutions.net.';
      resultEl.className = 'form__result error';
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  ['name', 'phone', 'email', 'loanType'].forEach((fieldName) => {
    const el = form.elements[fieldName];
    if (el) {
      el.addEventListener('input', () => setError(fieldName, ''));
      el.addEventListener('change', () => setError(fieldName, ''));
    }
  });
})();
