/* ============================================================
   FOOTER YEAR
   ============================================================ */
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* ============================================================
   FADE-IN
   ============================================================ */
(function () {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  els.forEach((el) => obs.observe(el));
})();

/* ============================================================
   MORTGAGE CALCULATOR (full PITI)
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  const inputs = {
    price:     $('price'),
    down:      $('down'),
    rate:      $('rate'),
    term:      $('term'),
    tax:       $('tax'),
    insurance: $('insurance'),
    hoa:       $('hoa'),
    pmiRate:   $('pmi-rate'),
  };
  if (!inputs.price) return;

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  /* parse a number out of a formatted string ("450,000" -> 450000) */
  function num(el) {
    const v = parseFloat(String(el.value).replace(/[^0-9.]/g, ''));
    return isNaN(v) ? 0 : v;
  }

  /* add thousands separators to money fields on blur */
  function formatThousands(el) {
    const v = num(el);
    el.value = v ? v.toLocaleString('en-US') : '';
  }

  function calc() {
    const price = num(inputs.price);
    let down = num(inputs.down);
    if (down > price) down = price;

    const loan = Math.max(price - down, 0);
    const dpPct = price > 0 ? (down / price) * 100 : 0;

    const annualRate = num(inputs.rate) / 100;
    const r = annualRate / 12;
    const n = parseInt(inputs.term.value, 10) * 12;

    /* principal & interest */
    let pi = 0;
    if (loan > 0) {
      pi = r > 0
        ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
        : loan / n;
    }

    const tax = (price * (num(inputs.tax) / 100)) / 12;
    const ins = num(inputs.insurance) / 12;
    const hoa = num(inputs.hoa);

    /* PMI only when down payment < 20% */
    const pmiApplies = dpPct < 20 && loan > 0;
    const pmi = pmiApplies ? (loan * (num(inputs.pmiRate) / 100)) / 12 : 0;

    const total = pi + tax + ins + hoa + pmi;

    /* --- write results --- */
    $('calc-total').innerHTML = usd.format(total) + '<span>/mo</span>';
    $('b-pi').textContent  = usd.format(pi);
    $('b-tax').textContent = usd.format(tax);
    $('b-ins').textContent = usd.format(ins);
    $('b-pmi').textContent = usd.format(pmi);
    $('b-hoa').textContent = usd.format(hoa);

    $('m-loan').textContent = usd2.format(loan);
    $('m-dp').textContent   = dpPct.toFixed(dpPct % 1 === 0 ? 0 : 1) + '%';
    $('down-pct').textContent = '(' + dpPct.toFixed(dpPct % 1 === 0 ? 0 : 1) + '%)';

    /* show/hide PMI + HOA rows */
    $('row-pmi').style.display = pmiApplies ? '' : 'none';
    $('row-hoa').style.display = hoa > 0 ? '' : 'none';

    /* PMI note */
    const note = $('pmi-note');
    if (pmiApplies) {
      note.textContent = 'PMI is included because your down payment is under 20%. It typically drops off once you reach 20% equity.';
      note.style.display = '';
    } else if (loan > 0) {
      note.textContent = 'No PMI — your down payment is 20% or more.';
      note.style.display = '';
    } else {
      note.style.display = 'none';
    }

    /* stacked proportion bar */
    const bar = $('calc-bar');
    if (total > 0) {
      const seg = (val, cls) => val > 0 ? `<span class="${cls}" style="width:${(val / total) * 100}%"></span>` : '';
      bar.innerHTML =
        seg(pi, 'dot--pi') + seg(tax, 'dot--tax') + seg(ins, 'dot--ins') +
        seg(pmi, 'dot--pmi') + seg(hoa, 'dot--hoa');
    } else {
      bar.innerHTML = '';
    }
  }

  /* recalc live on input */
  Object.values(inputs).forEach((el) => {
    el.addEventListener('input', calc);
    el.addEventListener('change', calc);
  });

  /* tidy money fields on blur, then recalc */
  ['price', 'down', 'insurance', 'hoa'].forEach((k) => {
    inputs[k].addEventListener('blur', () => { formatThousands(inputs[k]); calc(); });
  });

  calc();
})();

/* ============================================================
   DOWN-PAYMENT HELP — CONTACT FORM
   ============================================================ */
(function () {
  const form = document.getElementById('dpa-form');
  if (!form) return;
  const submitBtn = document.getElementById('dpa-submit');
  const resultEl = document.getElementById('dpa-result');

  function setError(field, msg) {
    const el = form.elements[field];
    const errEl = document.getElementById('dpa-' + field + '-error');
    if (el) el.classList.toggle('error', !!msg);
    if (errEl) errEl.textContent = msg || '';
  }

  function validate(d) {
    let ok = true;
    if (!d.name.trim()) { setError('name', 'Please enter your full name.'); ok = false; }
    if (!d.phone.trim()) { setError('phone', 'Please enter your phone number.'); ok = false; }
    else if (!/^[\d\s\-\+\(\)\.]{7,20}$/.test(d.phone.trim())) { setError('phone', 'Please enter a valid phone number.'); ok = false; }
    if (!d.email.trim()) { setError('email', 'Please enter your email address.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) { setError('email', 'Please enter a valid email address.'); ok = false; }
    return ok;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ['name', 'phone', 'email'].forEach((f) => setError(f, ''));
    resultEl.className = 'form__result';
    resultEl.textContent = '';

    const data = {
      name:  form.elements['name'].value,
      phone: form.elements['phone'].value,
      email: form.elements['email'].value,
      loanType: 'Down Payment Assistance',
      message: 'Submitted from the payment calculator — interested in down-payment help.',
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
        resultEl.textContent = "Thanks! I'll reach out within 24 hours to talk through your options.";
        resultEl.className = 'form__result success';
        form.reset();
      } else { throw new Error(json.error || 'Server error'); }
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please call or text 971-444-9107, or email phuong.ha@mortgagesolutions.net.';
      resultEl.className = 'form__result error';
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  ['name', 'phone', 'email'].forEach((f) => {
    const el = form.elements[f];
    if (el) el.addEventListener('input', () => setError(f, ''));
  });
})();
