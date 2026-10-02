// Oregon Home Buyer School — free weekly class registration.
// GET  → upcoming session dates (from _class-schedule.js)
// POST → validate, send confirmation (+ calendar file) now, schedule the day-before / hour-before /
//        "we're live" reminders with Resend, notify Phuong, and hand the lead to the CRM relay.
// Env: RESEND_API_KEY (existing), CLASS_JOIN_URL (recurring Zoom link), WWW_RELAY_URL + WWW_SITE_TOKEN (CRM relay).
// Reminders are scheduled here — not in the CRM — so they go out on time even when the CRM drive is unplugged.

const crypto = require('crypto');
const { upcomingSessions, label, MINUTES } = require('./_class-schedule.js');
const { sendToRelay } = require('./_relay.js');

const FROM = 'Phuong Ha <class@phuongha.loans>';
const REPLY_TO = 'phuong.ha@mortgagesolutions.net';
const NOTIFY = ['phuonghaloans@gmail.com', 'phuong.ha@mortgagesolutions.net'];
const CLASS_NAME = 'Oregon Home Buyer School';
const FOOTER_TEXT =
  "You're getting this because you registered for the free Oregon Home Buyer School class at phuongha.loans. Reply \"stop\" and I'll take you off the list.\n" +
  'Phuong Ha, Licensed Mortgage Loan Originator, NMLS #1839449 · 900 Main Street, Suite 106, Oregon City, OR 97045 · 971-444-9107\n' +
  'Mortgage Solutions of Colorado, LLC., dba Mortgage Solutions Financial, NMLS #61602. Equal Housing Lender. This is not a commitment to lend.';

const BLOCKED_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com', 'yopmail.com', 'sharklasers.com', 'trashmail.com', 'fakeinbox.com', 'maildrop.cc', 'dispostable.com'];
const RATE_WINDOW = 10 * 60 * 1000;
const RATE_MAX = 5;
const ipLog = new Map();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const clean = (s, n = 200) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);

function checkRate(ip) {
  const now = Date.now();
  const e = ipLog.get(ip) || { count: 0, start: now };
  if (now - e.start > RATE_WINDOW) return ipLog.set(ip, { count: 1, start: now }), true;
  if (e.count >= RATE_MAX) return false;
  e.count++;
  ipLog.set(ip, e);
  return true;
}

// ---------- email building ----------

function html(firstName, paragraphs, button) {
  const ps = paragraphs.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join('\n');
  const btn = button
    ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#c9a84c;color:#0a1628;font-weight:700;padding:13px 26px;border-radius:8px;text-decoration:none">${esc(button.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">
<p style="margin:0 0 14px">Hi ${esc(firstName) || 'there'},</p>
${ps}
${btn}
<p style="margin:0 0 14px">Phuong Ha</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 14px">
<div style="font-size:12px;line-height:1.5;color:#777">${FOOTER_TEXT.split('\n').map(esc).join('<br>')}</div>
</div></body></html>`;
}

function text(firstName, paragraphs, button) {
  const strip = (s) => s.replace(/<[^>]+>/g, '');
  return [`Hi ${firstName || 'there'},`, ...paragraphs.map(strip), button ? `${button.label}: ${button.url}` : '', 'Phuong Ha', '--', FOOTER_TEXT].filter(Boolean).join('\n\n');
}

function ics(session, joinUrl, email) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(session.iso);
  const end = new Date(start.getTime() + MINUTES * 60000);
  const uid = crypto.createHash('sha1').update(session.iso + email).digest('hex') + '@phuongha.loans';
  const escIcs = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//phuongha.loans//class//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${escIcs(CLASS_NAME + ' (free live class)')}`,
    `DESCRIPTION:${escIcs(`Join on Zoom: ${joinUrl}\nBring your questions. Hosted by Phuong Ha, NMLS #1839449.`)}`,
    `LOCATION:${escIcs(joinUrl)}`, `URL:${joinUrl}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Class starts in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

async function resend(payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

/** The four registrant emails. Exported for testing. */
function buildEmails({ firstName, email, session, joinUrl, now = Date.now() }) {
  const start = new Date(session.iso).getTime();
  const when = `${session.day} at ${session.time} Pacific`;
  const join = { label: 'Join the class on Zoom', url: joinUrl };
  const base = { from: FROM, to: [email], reply_to: REPLY_TO };
  const mk = (subject, paragraphs, button, extra = {}) => ({ ...base, subject, html: html(firstName, paragraphs, button), text: text(firstName, paragraphs, button), ...extra });
  const emails = [];

  emails.push(
    mk(
      `You're in: ${CLASS_NAME}, ${session.day}`,
      [
        `Your seat is saved for <b>${esc(when)}</b>. It's a live 60-minute class on Zoom, and it's free.`,
        'Here is what we will cover: which Oregon and Washington down payment programs exist, the conditions that actually decide whether one fits you, the order things happen in, and the mistakes I see cost people the most.',
        'The calendar file is attached so it lands on your calendar with a reminder. Bring your questions — the last part of the class is open Q&A.',
        'One thing to do before class: write down the county you want to buy in and roughly what you pay in rent. That is all you need.',
      ],
      join,
      { attachments: [{ filename: 'oregon-home-buyer-school.ics', content: Buffer.from(ics(session, joinUrl, email)).toString('base64') }] }
    )
  );

  const dayBefore = start - 24 * 3600e3;
  if (dayBefore > now + 60 * 60e3)
    emails.push(mk(`Tomorrow: ${CLASS_NAME}`, [`Quick reminder that the class is tomorrow, <b>${esc(when)}</b>.`, 'If you have a specific question, reply to this email with it and I will make sure we cover it.'], join, { scheduled_at: new Date(dayBefore).toISOString() }));

  const hourBefore = start - 60 * 60e3;
  if (hourBefore > now + 10 * 60e3)
    emails.push(mk('Class starts in 1 hour', [`We start at <b>${esc(session.time)} Pacific</b>. The link below works on a phone or a computer.`], join, { scheduled_at: new Date(hourBefore).toISOString() }));

  if (start > now + 5 * 60e3) emails.push(mk("We're live — join now", ['The class is starting now. Tap below to join.'], join, { scheduled_at: new Date(start).toISOString() }));

  return emails;
}

// ---------- handler ----------

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ sessions: upcomingSessions() });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });

  const b = req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot
  const loaded = parseInt(b._t, 10);
  if (!isNaN(loaded) && Date.now() - loaded < 3000) return res.status(200).json({ ok: true }); // filled too fast to be human

  const firstName = clean(b.first_name, 80);
  const lastName = clean(b.last_name, 80);
  const email = clean(b.email).toLowerCase();
  const phone = clean(b.phone, 40);
  const county = clean(b.county, 60);
  if (!firstName || !email) return res.status(400).json({ error: 'Your first name and email are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (BLOCKED_DOMAINS.includes(email.split('@')[1])) return res.status(400).json({ error: 'Please use a personal or work email address.' });

  const session = upcomingSessions().find((s) => s.iso === b.session);
  if (!session) return res.status(400).json({ error: 'That class date is no longer open. Please pick another date.' });

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Server configuration error.' });
  const joinUrl = process.env.CLASS_JOIN_URL || 'https://phuongha.loans/class.html';
  if (!process.env.CLASS_JOIN_URL) console.error('CLASS_JOIN_URL is not set — emails link to the class page instead of Zoom');

  const quiz = {
    county,
    owned_last_3_years: clean(b.owned_recently, 20),
    income_band: clean(b.income_band, 40),
    veteran: clean(b.veteran, 20),
    timeline: clean(b.timeline, 40),
    savings: clean(b.savings, 40),
    took_quiz: b.took_quiz ? 'yes' : '',
  };
  const fields = Object.fromEntries(Object.entries({ class_session_at: session.iso, ...quiz, utm_source: clean(b.utm_source, 60), utm_campaign: clean(b.utm_campaign, 60), heard_from: clean(b.heard_from, 60) }).filter(([, v]) => v));

  try {
    const emails = buildEmails({ firstName, email, session, joinUrl });
    // Confirmation first (if this fails, report the error); reminders and notifications after.
    await resend(emails[0]);
    const later = await Promise.allSettled(emails.slice(1).map(resend));
    later.filter((r) => r.status === 'rejected').forEach((r) => console.error('reminder schedule failed:', r.reason?.message));

    const lines = [`Class: ${session.label}`, `Name: ${firstName} ${lastName}`.trim(), `Email: ${email}`, `Phone: ${phone || '—'}`, ...Object.entries(quiz).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)];
    await Promise.allSettled([
      resend({ from: 'leads@phuongha.loans', to: NOTIFY, reply_to: email, subject: `Class signup — ${firstName} — ${session.day}`, text: lines.join('\n') }),
      sendToRelay({ site: 'phuongha.loans/class', first_name: firstName, last_name: lastName, email, phone, message: `Registered for ${CLASS_NAME} — ${session.label}`, fields }),
    ]);
    return res.status(200).json({ ok: true, session: session.label });
  } catch (err) {
    console.error('register-class error:', err);
    return res.status(500).json({ error: "Something went wrong saving your seat. Please try again or call 971-444-9107." });
  }
};

module.exports.buildEmails = buildEmails;
module.exports.ics = ics;
