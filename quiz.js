/* Oregon homebuyer program quiz (quiz.html). Runs entirely in the browser — answers are only sent
   if the visitor clicks through to save a class seat (passed along as URL parameters). */
(function () {
  const root = document.getElementById('quiz');
  if (!root) return;

  const OREGON = ['Multnomah', 'Washington', 'Clackamas', 'Marion', 'Polk', 'Yamhill', 'Lane', 'Deschutes', 'Jackson', 'Linn or Benton', 'An Oregon Coast county', 'Somewhere else in Oregon'];
  const WASHINGTON = ['Clark County, WA', 'Somewhere else in Washington'];
  const METRO = ['Multnomah', 'Washington', 'Clackamas', 'Clark County, WA'];

  const IMG = 'img/quiz/';
  const o = (label, img) => ({ label, img: IMG + img + '.svg' });

  // Where-to-buy is asked as a picture of the region first, then the county (when a region has more than one).
  const REGIONS = [
    { label: 'Portland metro', img: IMG + 'region-metro.svg', counties: ['Multnomah', 'Washington', 'Clackamas', 'Clark County, WA'] },
    { label: 'Willamette Valley', img: IMG + 'region-valley.svg', counties: ['Marion', 'Polk', 'Yamhill', 'Lane', 'Linn or Benton'] },
    { label: 'Central, Southern & Eastern Oregon', img: IMG + 'region-central.svg', counties: ['Deschutes', 'Jackson', 'Somewhere else in Oregon'] },
    { label: 'Oregon Coast', img: IMG + 'region-coast.svg', counties: ['An Oregon Coast county'] },
    { label: 'Elsewhere in Washington', img: IMG + 'region-washington.svg', counties: ['Somewhere else in Washington'] },
    { label: 'Not sure yet', img: IMG + 'region-notsure.svg', counties: ['Not sure yet'] },
  ];
  const COUNTY_LABEL = { Multnomah: 'Multnomah County', Washington: 'Washington County, OR', Clackamas: 'Clackamas County', Marion: 'Marion County', Polk: 'Polk County', Yamhill: 'Yamhill County', Lane: 'Lane County', Deschutes: 'Deschutes County', Jackson: 'Jackson County', 'Linn or Benton': 'Linn or Benton County' };

  const QUESTIONS = [
    { key: 'county', type: 'region', q: 'Where do you want to buy?', help: 'Programs differ by state, and local help differs by county.' },
    { key: 'owned_recently', q: 'Have you owned a home in the last three years?', help: 'For many programs, "first-time buyer" just means you haven’t owned in the past three years.', opts: [o('No, never owned', 'owned-never'), o('Not in the last three years', 'owned-3yrs'), o('Yes, I own or owned recently', 'owned-yes')] },
    { key: 'income_band', q: 'Roughly, what is your household’s yearly income?', help: 'Programs set income limits by county and household size. Your best guess is enough — we confirm the real limits together.', opts: [o('Lower to moderate for my area', 'income-lower'), o('Middle of the road', 'income-middle'), o('On the higher side', 'income-higher'), o('Prefer not to say', 'income-private')] },
    { key: 'veteran', q: 'Are you (or your spouse) a veteran, active-duty service member, or surviving spouse?', opts: [o('Yes', 'vet-yes'), o('No', 'vet-no')] },
    { key: 'area', q: 'What kind of area are you looking in?', help: 'Some federal programs only apply outside larger cities.', opts: [o('In or near a city', 'area-city'), o('Small town or rural area', 'area-rural'), o('Not sure / open to either', 'area-either')] },
    { key: 'public_service', q: 'Do you work as a teacher, firefighter, police officer or EMT?', opts: [o('Yes', 'public-yes'), o('No', 'public-no')] },
    { key: 'savings', q: 'How much do you have saved toward buying?', help: 'Down payment, closing costs and moving money combined.', opts: [o('Very little so far', 'savings-little'), o('Some, but not a lot', 'savings-some'), o('A solid amount', 'savings-solid')] },
    { key: 'timeline', q: 'When would you like to be in your own place?', opts: [o('Within 3 months', 'time-3mo'), o('3 to 6 months', 'time-6mo'), o('6 to 12 months', 'time-12mo'), o('More than a year', 'time-1yr'), o('Just learning for now', 'time-learning')] },
  ];

  const answers = {};
  let step = 0;
  let region = null; // region picked on question 1, while choosing the county
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Warm the cache so the next question's pictures appear instantly.
  function preload(i) {
    const Q = QUESTIONS[i];
    if (!Q) return;
    (Q.type === 'region' ? REGIONS : Q.opts).forEach((x) => { const im = new Image(); im.src = x.img; });
  }

  function cards(list, picked) {
    return `<div class="qz__pics qz__pics--${list.length}">${list
      .map((x, i) => `<button type="button" class="qz__pic${picked === x.label ? ' is-picked' : ''}" data-i="${i}"><span class="qz__img"><img src="${x.img}" alt="" width="320" height="200" decoding="async"></span><span class="qz__lbl">${esc(x.label)}</span></button>`)
      .join('')}</div>`;
  }

  function frame(title, help, inner, stepNo) {
    return `
      <div class="qz__bar"><i style="width:${(stepNo / QUESTIONS.length) * 100}%"></i></div>
      <p class="qz__step">Question ${stepNo + 1} of ${QUESTIONS.length}</p>
      <h2>${esc(title)}</h2>
      ${help ? `<p class="qz__help">${esc(help)}</p>` : '<div style="height:12px"></div>'}
      <div class="qz__body">${inner}</div>
      <div class="qz__nav">${stepNo || region ? '<button type="button" class="qz__back">← Back</button>' : '<span></span>'}<span></span></div>`;
  }

  function choose(btn, done) {
    root.querySelectorAll('.qz__pic, .qz__chip').forEach((b) => (b.disabled = true));
    btn.classList.add('is-picked');
    setTimeout(done, reduceMotion ? 0 : 260);
  }

  function next(value) {
    answers[QUESTIONS[step].key] = value;
    region = null;
    step++;
    render();
    // Keep the new question in view, below the fixed menu bar.
    const bar = document.querySelector('.topbar');
    const offset = bar && /fixed|sticky/.test(getComputedStyle(bar).position) ? bar.getBoundingClientRect().bottom : 0;
    const top = root.getBoundingClientRect().top;
    if (top < offset + 8) window.scrollTo({ top: window.scrollY + top - offset - 12, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function render() {
    if (step >= QUESTIONS.length) return renderResults();
    const Q = QUESTIONS[step];
    preload(step + 1);

    if (Q.type === 'region' && region) {
      // County follow-up for the picked region.
      const r = region;
      root.innerHTML = frame('Which county?', `${r.label}. Local programs change at the county line.`, `
        <div class="qz__sub"><img src="${r.img}" alt="" width="320" height="200"><div class="qz__chips">${r.counties
          .map((c, i) => `<button type="button" class="qz__chip${answers.county === c ? ' is-picked' : ''}" data-i="${i}">${esc(COUNTY_LABEL[c] || c)}</button>`)
          .join('')}</div></div>`, step);
      root.querySelectorAll('.qz__chip').forEach((b) => b.addEventListener('click', () => choose(b, () => next(r.counties[Number(b.dataset.i)]))));
    } else if (Q.type === 'region') {
      const pickedRegion = REGIONS.find((x) => x.counties.includes(answers.county));
      root.innerHTML = frame(Q.q, Q.help, cards(REGIONS, pickedRegion && pickedRegion.label), step);
      root.querySelectorAll('.qz__pic').forEach((b) =>
        b.addEventListener('click', () => {
          const r = REGIONS[Number(b.dataset.i)];
          choose(b, () => {
            if (r.counties.length === 1) return next(r.counties[0]);
            region = r;
            render();
          });
        })
      );
    } else {
      root.innerHTML = frame(Q.q, Q.help, cards(Q.opts, answers[Q.key]), step);
      root.querySelectorAll('.qz__pic').forEach((b) => b.addEventListener('click', () => choose(b, () => next(Q.opts[Number(b.dataset.i)].label))));
    }

    const back = root.querySelector('.qz__back');
    if (back)
      back.addEventListener('click', () => {
        if (region) region = null;
        else {
          step--;
          if (QUESTIONS[step].type === 'region') region = REGIONS.find((x) => x.counties.length > 1 && x.counties.includes(answers.county)) || null;
        }
        render();
      });
  }

  const OHCS = 'https://www.oregon.gov/ohcs/homeownership/homebuyers/pages/flex-lending.aspx';
  const FIRSTHOME = 'https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/first-home-gov-product-summary.aspx';

  function programs(a) {
    const inOregon = OREGON.includes(a.county) || a.county === 'Not sure yet';
    const inWashington = WASHINGTON.includes(a.county) || a.county === 'Not sure yet';
    const firstTime = a.owned_recently !== 'Yes, I own or owned recently';
    const overNextStep = a.income_band === 'On the higher side';
    const out = [];
    if (inOregon && firstTime)
      out.push({ tag: 'Oregon · state program', title: 'OHCS Flex Lending: FirstHome', body: `Oregon's program for buyers who haven't owned in the last three years. It pairs a first mortgage with assistance that can go toward your down payment, closing costs and prepaid items. Expect a homebuyer education course, a credit minimum, and income and price limits set by county. <a href="${FIRSTHOME}" target="_blank" rel="noopener">OHCS details</a>` });
    if (inOregon && !overNextStep)
      out.push({ tag: 'Oregon · state program', title: 'OHCS Flex Lending: NextStep', body: `No first-time buyer requirement, so it's the one to ask about if you've owned before. It has a household income cap. <a href="${OHCS}" target="_blank" rel="noopener">OHCS details</a>` });
    if (inOregon && overNextStep && !firstTime)
      out.push({ tag: 'Oregon', title: 'Conventional options with low upfront cash', body: 'Your income may be above the state assistance limits for repeat buyers, but there are still low-upfront-cash conventional and FHA routes worth comparing. We cover them in class.' });
    if (inWashington)
      out.push({ tag: 'Washington · state programs', title: 'WSHFC Home Advantage and related programs', body: 'The Washington State Housing Finance Commission runs the state’s assistance programs. Relevant if you’re buying in Clark County and commuting into Portland. <a href="blog-dpa-washington-wshfc.html">How they work</a>' });
    if (METRO.includes(a.county))
      out.push({ tag: 'Local', title: `Local help in ${a.county}`, body: 'County and city programs can sit on top of the state’s, and they differ across the county line. Availability changes, so this is one we check together. <a href="blog-dpa-local-counties.html">County breakdown</a>' });
    if (a.veteran === 'Yes')
      out.push({ tag: 'Federal', title: 'VA home loans', body: 'An earned benefit for eligible service members, veterans and surviving spouses that can sharply reduce what you need upfront. It can sometimes be combined with other help for closing costs. <a href="blog-zero-down.html">VA and USDA explained</a>' });
    if (a.area !== 'In or near a city' && a.county !== 'Multnomah')
      out.push({ tag: 'Federal', title: 'USDA home loans', body: 'For homes in eligible areas outside larger cities, with income limits. Plenty of Oregon towns qualify. Eligibility is by address, so we check the map together. <a href="blog-zero-down.html">How it works</a>' });
    if (a.public_service === 'Yes')
      out.push({ tag: 'Federal', title: 'Good Neighbor Next Door and public-service programs', body: 'HUD’s program for teachers, firefighters, police and EMTs applies to specific HUD homes in revitalization areas, so inventory is limited, but it’s worth knowing about. Some lenders have their own options too. <a href="blog-dpa-teachers-first-responders.html">Programs for public service</a>' });
    if (a.savings !== 'A solid amount')
      out.push({ tag: 'Loan type', title: 'FHA paired with assistance', body: 'The most common pairing for buyers who are light on savings: a flexible first mortgage plus assistance toward cash to close. <a href="blog-dpa-fha-combo.html">FHA + assistance</a>' });
    return out;
  }

  function timelineText(a) {
    const quick = a.timeline === 'Within 3 months' || a.timeline === '3 to 6 months';
    if (quick && a.savings === 'Very little so far')
      return 'Your timeline is short and savings are light, so programs that help with cash to close matter most. Start with the class this week, then a 15-minute call so we can check the specific programs against your county. Homebuyer education, if a program requires it, takes a few hours and is worth doing early.';
    if (quick) return 'A purchase in this window is realistic. The order matters: know which programs fit, take any required homebuyer education, then get pre-approved before you tour seriously. The class covers that order step by step.';
    if (a.timeline === 'Just learning for now') return 'Learning first is the right move. The class gives you the full picture in an hour with no pressure, and you can come back to it when the timing is right.';
    return 'You have time to set this up well: see what exists, take homebuyer education if a program needs it, and work on anything in your credit or savings that would widen your options. The class shows you what to do in which order.';
  }

  function renderResults() {
    const list = programs(answers);
    const qs = new URLSearchParams({
      county: answers.county === 'Not sure yet' ? '' : answers.county,
      owned_recently: answers.owned_recently,
      income_band: answers.income_band,
      veteran: answers.veteran,
      timeline: answers.timeline,
      savings: answers.savings,
      took_quiz: '1',
    });
    root.innerHTML = `
      <div class="qz__bar"><i style="width:100%"></i></div>
      <div class="qz-res">
        <p class="qz__step">Your results</p>
        <h2>${list.length} ${list.length === 1 ? 'option is' : 'options are'} worth a proper look.</h2>
        <p class="qz__help">Based on your answers. Final eligibility depends on details we haven't asked about, like credit, the property and current program funding.</p>
        <div class="qz-res__list">${list
          .map((p) => `<div class="qz-res__item"><span class="qz-res__tag">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><p>${p.body}</p></div>`)
          .join('')}</div>
        <div class="qz-res__timeline"><b>Your realistic next step:</b> ${esc(timelineText(answers))}</div>
        <div class="qz-res__ctas">
          <a class="cta" href="class.html?${qs.toString()}#register"><span class="cta__icon"><svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span><span>Save a seat in the free class</span></a>
          <a class="cta cta--ghost" href="index.html#contact">Request a 15-minute call</a>
          <button type="button" class="qz__back" id="qz-restart">Start over</button>
        </div>
      </div>`;
    document.getElementById('qz-restart').addEventListener('click', () => {
      step = 0;
      Object.keys(answers).forEach((k) => delete answers[k]);
      render();
    });
  }

  render();
})();
