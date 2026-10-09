/* County income-limit map for blog-dpa-income-limits.html.
   Data: income-limits-data.js (HUD FY2026 income limits, regenerated yearly). Styles: style.css .ilmap */
(function () {
  const root = document.getElementById('ilmap');
  const D = window.IL_DATA;
  if (!root || !D) return;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const fmt = (n) => '$' + n.toLocaleString('en-US');
  // Sequential classes by area median income: one gold hue, deep amber -> bright gold on navy.
  const BREAKS = [85000, 100000, 115000, 130000];
  const RAMP = ['#4A3A1E', '#74562A', '#9E7436', '#C8913A', '#F0BE5C'];
  // Softer, compressed gold for the state you're not pointing at
  const SOFT = ['#5E5440', '#6C5F46', '#7A6A4C', '#887552', '#968058'];
  const LABELS = ['< $85k', '$85–100k', '$100–115k', '$115–130k', '$130k+'];
  const cls = (m) => BREAKS.filter((b) => m >= b).length;

  const svg = root.querySelector('.ilmap__svg');
  const tip = root.querySelector('.ilmap__tip');
  const selCounty = root.querySelector('#il-county');
  const selHH = root.querySelector('#il-hh');
  const panel = root.querySelector('.ilmap__panel');
  svg.setAttribute('viewBox', D.viewBox);

  const byFips = new Map();
  const shapes = new Map();
  // One group per state so the inactive state can fade back (style.css [data-active])
  const groups = {};
  ['OR', 'WA'].forEach((st) => {
    groups[st] = document.createElementNS(SVGNS, 'g');
    groups[st].setAttribute('class', 'ilmap__state ilmap__state--' + st);
    svg.appendChild(groups[st]);
  });
  D.counties.forEach((c) => {
    byFips.set(c.fips, c);
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', c.d);
    p.style.setProperty('--bold', RAMP[cls(c.median)]);
    p.style.setProperty('--soft', SOFT[cls(c.median)]);
    p.setAttribute('class', 'ilmap__county');
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', `${c.name}, ${c.state}`);
    p.dataset.fips = c.fips;
    groups[c.state].appendChild(p);
    shapes.set(c.fips, p);

    const o = document.createElement('option');
    o.value = c.fips;
    o.textContent = `${c.name}, ${c.state}`;
    selCounty.appendChild(o);
  });
  const border = document.createElementNS(SVGNS, 'path');
  border.setAttribute('d', D.stateBorder);
  border.setAttribute('class', 'ilmap__stateline');
  svg.appendChild(border);
  const outline = document.createElementNS(SVGNS, 'path');
  outline.setAttribute('d', D.outline);
  outline.setAttribute('class', 'ilmap__outline');
  svg.appendChild(outline);
  // State labels: Washington north, Oregon south
  [['WASHINGTON', 'WA'], ['OREGON', 'OR']].forEach(([label, st]) => {
    const cs = D.counties.filter((c) => c.state === st);
    const x = cs.reduce((s, c) => s + c.c[0], 0) / cs.length;
    const y = cs.reduce((s, c) => s + c.c[1], 0) / cs.length;
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', Math.round(x + 40));
    t.setAttribute('y', Math.round(y));
    t.setAttribute('class', 'ilmap__statelabel ilmap__statelabel--' + st);
    t.textContent = label;
    svg.appendChild(t);
  });
  // Selection ring drawn on top so the selected county's full outline shows
  const ring = document.createElementNS(SVGNS, 'path');
  ring.setAttribute('class', 'ilmap__ring');
  svg.appendChild(ring);

  // Legend
  const legend = root.querySelector('.ilmap__legend');
  legend.innerHTML = `
    <li class="ilmap__legend-title">Area median family income</li>
    <li class="ilmap__legend-row">${RAMP.map((col) => `<span class="ilmap__swatch" style="background:${col}"></span>`).join('')}</li>
    <li class="ilmap__legend-scale">${LABELS.map((l) => `<span>${l}</span>`).join('')}</li>`;

  let current = null;
  // The pointed-at state shows bold; otherwise the selected county's state does.
  function setActive(st) { if (svg.dataset.active !== st) svg.dataset.active = st; }
  const selectedState = () => (current ? byFips.get(current).state : 'OR');

  function render() {
    const c = current ? byFips.get(current) : null;
    if (!c) return;
    const hh = Number(selHH.value);
    const shared = D.counties.filter((x) => x.area === c.area && x.fips !== c.fips).length;
    const rows = c.l80.map((v, i) =>
      `<tr${i + 1 === hh ? ' class="is-on"' : ''}><td>${i + 1} ${i ? 'people' : 'person'}</td><td>${fmt(v)}</td><td>${fmt(c.l50[i])}</td></tr>`).join('');
    panel.innerHTML = `
      <p class="ilmap__eyebrow">${c.name}, ${c.state === 'OR' ? 'Oregon' : 'Washington'}</p>
      <p class="ilmap__area">HUD area: ${c.area}${shared ? ` <span>(same limits as ${shared} other ${shared === 1 ? 'county' : 'counties'})</span>` : ''}</p>
      <div class="ilmap__hero">
        <span class="ilmap__hero-num">${fmt(c.l80[hh - 1])}</span>
        <span class="ilmap__hero-lbl">80% income limit, household of ${hh}</span>
      </div>
      <p class="ilmap__median">Area median family income: <strong>${fmt(c.median)}</strong></p>
      <table class="ilmap__table">
        <caption class="sr-only">HUD FY2026 income limits for ${c.name}, ${c.state}</caption>
        <thead><tr><th>Household</th><th>80% limit</th><th>50% limit</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    shapes.forEach((p, f) => p.classList.toggle('is-on', f === c.fips));
    ring.setAttribute('d', c.d);
  }
  function select(fips) {
    current = fips;
    selCounty.value = fips;
    setActive(byFips.get(fips).state);
    render();
  }

  svg.addEventListener('click', (e) => {
    const f = e.target.dataset && e.target.dataset.fips;
    if (f) select(f);
  });
  svg.addEventListener('keydown', (e) => {
    const f = e.target.dataset && e.target.dataset.fips;
    if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(f); }
  });
  selCounty.addEventListener('change', () => select(selCounty.value));
  selHH.addEventListener('change', render);

  // Hover tooltip (pointer devices only)
  svg.addEventListener('pointermove', (e) => {
    const f = e.target.dataset && e.target.dataset.fips;
    if (!f || e.pointerType === 'touch') { tip.hidden = true; return; }
    const c = byFips.get(f);
    setActive(c.state);
    const box = root.querySelector('.ilmap__mapwrap').getBoundingClientRect();
    tip.innerHTML = `<strong>${c.name}, ${c.state}</strong><span>Median ${fmt(c.median)}</span>`;
    tip.style.left = (e.clientX - box.left + 14) + 'px';
    tip.style.top = (e.clientY - box.top + 14) + 'px';
    tip.hidden = false;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; setActive(selectedState()); });
  svg.addEventListener('focusin', (e) => {
    const f = e.target.dataset && e.target.dataset.fips;
    if (f) setActive(byFips.get(f).state);
  });
  svg.addEventListener('focusout', () => setActive(selectedState()));

  select('41005'); // Clackamas County: home base, so the panel is never empty
})();
