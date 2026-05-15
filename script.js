/* ============================================================
   NAV — scroll state
   ============================================================ */
(function () {
  const nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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

  /* --- validation helpers --- */
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

  /* --- submit handler --- */
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

    /* loading state */
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
        'Something went wrong. Please call us directly or email phuonghaloans@gmail.com.';
      resultEl.className = 'form__result error';
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  /* clear field errors on input */
  ['name', 'phone', 'email', 'loanType'].forEach((fieldName) => {
    const el = form.elements[fieldName];
    if (el) {
      el.addEventListener('input', () => setError(fieldName, ''));
      el.addEventListener('change', () => setError(fieldName, ''));
    }
  });
})();
