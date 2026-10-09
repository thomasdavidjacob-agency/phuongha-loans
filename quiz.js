/* Oregon homebuyer program quiz (quiz.html). Runs entirely in the browser — answers are only sent
   if the visitor clicks through to save a class seat (passed along as URL parameters). */
(function () {
  const root = document.getElementById('quiz');
  if (!root) return;

  const OREGON = ['Multnomah', 'Washington', 'Clackamas', 'Marion', 'Polk', 'Yamhill', 'Lane', 'Deschutes', 'Jackson', 'Linn or Benton', 'An Oregon Coast county', 'Somewhere else in Oregon'];
  const WASHINGTON = ['Clark County, WA', 'Somewhere else in Washington'];
  const METRO = ['Multnomah', 'Washington', 'Clackamas', 'Clark County, WA'];


  // Line icons (Lucide-style, 24px grid) drawn in the site's accent color.
  const ICONS = {
    city: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"/>',
    waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    pine: '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
    map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
    calclock: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4M8 2v4M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>',
    homecheck: '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m9 14 2 2 4-4"/>',
    bars1: '<path d="M6 20v-5"/><path d="M12 20v-9" opacity=".3"/><path d="M18 20V5" opacity=".3"/>',
    bars2: '<path d="M6 20v-5"/><path d="M12 20v-9"/><path d="M18 20V5" opacity=".3"/>',
    bars3: '<path d="M6 20v-5"/><path d="M12 20v-9"/><path d="M18 20V5"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    medal: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    barn: '<path d="M3 21V10l9-6 9 6v11"/><path d="M9 21v-6h6v6"/><path d="m9 15 6 6M15 15l-6 6"/><path d="M10 10h4"/>',
    signpost: '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    piggy: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    calrange: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M3 10h18M8 2v4M17 14h-6M13 18H7M7 14h.01M17 18h.01"/>',
    hourglass: '<path d="M5 22h14M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  };
  const svgIcon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const o = (label, icon) => ({ label, icon });

  // Where-to-buy is asked as a picture of the region first, then the county (when a region has more than one).
  const REGIONS = [
    { label: 'Portland metro', icon: 'city', counties: ['Multnomah', 'Washington', 'Clackamas', 'Clark County, WA'] },
    { label: 'Willamette Valley', icon: 'sprout', counties: ['Marion', 'Polk', 'Yamhill', 'Lane', 'Linn or Benton'] },
    { label: 'Central, Southern & Eastern Oregon', icon: 'mountain', counties: ['Deschutes', 'Jackson', 'Somewhere else in Oregon'] },
    { label: 'Oregon Coast', icon: 'waves', counties: ['An Oregon Coast county'] },
    { label: 'Elsewhere in Washington', icon: 'pine', counties: ['Somewhere else in Washington'] },
    { label: 'Not sure yet', icon: 'map', counties: ['Not sure yet'] },
  ];
  const COUNTY_LABEL = { Multnomah: 'Multnomah County', Washington: 'Washington County, OR', Clackamas: 'Clackamas County', Marion: 'Marion County', Polk: 'Polk County', Yamhill: 'Yamhill County', Lane: 'Lane County', Deschutes: 'Deschutes County', Jackson: 'Jackson County', 'Linn or Benton': 'Linn or Benton County' };

  const QUESTIONS = [
    { key: 'county', type: 'region', q: 'Where do you want to buy?', help: 'Programs differ by state, and local help differs by county.' },
    { key: 'owned_recently', q: 'Have you owned a home in the last three years?', help: 'For many programs, "first-time buyer" just means you haven’t owned in the past three years.', opts: [o('No, never owned', 'key'), o('Not in the last three years', 'calclock'), o('Yes, I own or owned recently', 'homecheck')] },
    { key: 'income_band', q: 'Roughly, what is your household’s yearly income?', help: 'Programs set income limits by county and household size. Your best guess is enough — we confirm the real limits together.', opts: [o('Lower to moderate for my area', 'bars1'), o('Middle of the road', 'bars2'), o('On the higher side', 'bars3'), o('Prefer not to say', 'lock')] },
    { key: 'veteran', q: 'Are you (or your spouse) a veteran, active-duty service member, or surviving spouse?', opts: [o('Yes', 'medal'), o('No', 'user')] },
    { key: 'area', q: 'What kind of area are you looking in?', help: 'Some federal programs only apply outside larger cities.', opts: [o('In or near a city', 'city'), o('Small town or rural area', 'barn'), o('Not sure / open to either', 'signpost')] },
    { key: 'public_service', q: 'Do you work as a teacher, firefighter, police officer or EMT?', opts: [o('Yes', 'shield'), o('No', 'briefcase')] },
    { key: 'savings', q: 'How much do you have saved toward buying?', help: 'Down payment, closing costs and moving money combined.', opts: [o('Very little so far', 'wallet'), o('Some, but not a lot', 'coins'), o('A solid amount', 'piggy')] },
    { key: 'timeline', q: 'When would you like to be in your own place?', opts: [o('Within 3 months', 'truck'), o('3 to 6 months', 'calendar'), o('6 to 12 months', 'calrange'), o('More than a year', 'hourglass'), o('Just learning for now', 'book')] },
  ];

  const answers = {};
  let step = 0;
  let region = null; // region picked on question 1, while choosing the county
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cards(list, picked) {
    return `<div class="qz__pics qz__pics--${list.length}">${list
      .map((x, i) => `<button type="button" class="qz__pic${picked === x.label ? ' is-picked' : ''}" data-i="${i}" aria-pressed="${picked === x.label}"><span class="qz__ico">${svgIcon(x.icon)}</span><span class="qz__lbl">${esc(x.label)}</span></button>`)
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

    if (Q.type === 'region' && region) {
      // County follow-up for the picked region.
      const r = region;
      root.innerHTML = frame('Which county?', `${r.label}. Local programs change at the county line.`, `
        <div class="qz__sub"><span class="qz__ico qz__ico--lg">${svgIcon(r.icon)}</span><div class="qz__chips">${r.counties
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

  function programs(a) {
    const inWashington = WASHINGTON.includes(a.county) || a.county === 'Not sure yet';
    const out = [];
    out.push({ tag: 'Lender program · OR & WA', title: 'MSF National DPA', body: 'Down payment assistance offered through Mortgage Solutions Financial, the lender I work with. It isn’t tied to one state’s housing agency, so it’s available in both Oregon and Washington. The program sets the terms and eligibility, so we check your numbers together. <a href="blog-dpa-msf-national.html">How it works</a>' });
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
