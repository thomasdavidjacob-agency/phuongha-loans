// Weekly class schedule — the single source of truth for which dates people can register for.
// Change the day/time with Vercel env vars (no code edit): CLASS_WEEKDAY (0=Sun … 2=Tue … 6=Sat),
// CLASS_TIME ("18:30", 24h Pacific), CLASS_WEEKS (how many upcoming dates to offer),
// CLASS_SKIP (comma-separated YYYY-MM-DD dates to skip, e.g. holidays).

const TZ = 'America/Los_Angeles';
const MINUTES = Number(process.env.CLASS_MINUTES || 60);

function tzOffsetMinutes(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - date.getTime()) / 60000;
}

/** The UTC instant for a wall-clock time in Pacific time (handles DST). */
function pacificToUtc(y, m, d, hh, mm) {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const first = new Date(guess.getTime() - tzOffsetMinutes(guess) * 60000);
  return new Date(guess.getTime() - tzOffsetMinutes(first) * 60000);
}

function label(date) {
  const day = date.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  return { day, time, label: `${day} · ${time} Pacific` };
}

function upcomingSessions(now = new Date()) {
  const weekday = Number(process.env.CLASS_WEEKDAY ?? 2);
  const [hh, mm] = String(process.env.CLASS_TIME || '18:30').split(':').map(Number);
  const weeks = Number(process.env.CLASS_WEEKS || 3);
  const skip = new Set(String(process.env.CLASS_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean));
  const out = [];
  for (let i = 0; i < 70 && out.length < weeks; i++) {
    const day = new Date(now.getTime() + i * 864e5);
    const ymd = day.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD in Pacific
    const [y, m, d] = ymd.split('-').map(Number);
    const start = pacificToUtc(y, m, d, hh, mm);
    if (new Date(start).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' }) !== ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday]) continue;
    if (skip.has(ymd)) continue;
    if (start.getTime() < now.getTime() + 30 * 60000) continue; // registration closes 30 min before
    if (out.some((s) => s.iso === start.toISOString())) continue;
    out.push({ iso: start.toISOString(), ...label(start) });
  }
  return out;
}

module.exports = { upcomingSessions, label, MINUTES, TZ };
