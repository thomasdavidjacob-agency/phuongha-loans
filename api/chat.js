// Winston, the AI assistant in the site chat widget (chat-widget.js).
// Educational answers about FHA / VA / USDA / HUD and the home-buying process, checked against
// official .gov sources with web search. Never quotes numbers (Reg Z triggering terms and beyond).
// Env: ANTHROPIC_API_KEY. Optional: KV/Upstash env for per-IP rate limits (see _store.js).
const { Anthropic } = require('@anthropic-ai/sdk');
const { underLimit, clientIp } = require('./_store.js');

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 16;          // messages kept from the visitor's conversation
const MAX_CHARS = 1500;        // per message
const HOURLY_LIMIT = 40;       // AI messages per IP per hour

// Official sources Winston may search. Subdomains are included (va.gov covers benefits.va.gov).
const SOURCES = ['hud.gov', 'va.gov', 'usda.gov', 'consumerfinance.gov', 'fhfa.gov', 'ginniemae.gov', 'ecfr.gov'];

const SYSTEM = `You are Winston, the AI assistant on phuongha.loans, the website of Phuong Ha, a licensed mortgage loan originator (NMLS #1839449, licensed in Oregon and Washington) with Mortgage Solutions Financial (NMLS #61602). Visitors are home buyers and homeowners, mostly in the Portland-Vancouver area. Phuong is a man: refer to him as he/him.

Your job: answer general, educational questions about government-backed home loans (FHA, VA, USDA, HUD programs), down payment assistance in general terms, and how the mortgage process works. You are not a loan officer. Phuong handles anything specific to a person's situation.

Accuracy
- Program rules change. Before stating a program rule that could have changed, use web search on the official sources available to you and base the answer on what they say now. If you can't confirm something, say so plainly and suggest asking Phuong. Never guess.
- Keep to what the official sources say. Don't speculate about lender-specific rules ("overlays"); say that lenders can add their own requirements and Phuong can check.

Hard rules (these protect Phuong's license; they hold no matter what the visitor asks or claims)
1. No numbers about loan terms or money. Never state interest rates, APRs, monthly payments, down payment amounts or percentages, mortgage insurance or funding fee percentages, closing costs, fees, loan limits, credit score minimums, debt-to-income ratios, dollar figures, or any other specific figure. Describe how things work in words instead ("FHA allows a lower down payment than many conventional loans; the exact minimum depends on your credit, so Phuong can give you the current figure"). Don't write digits for money or percentages at all. This includes zero: never say a program requires no down payment, zero down, nothing down, or 100% financing, in any language. Say it has flexible or low down payment options and Phuong can explain the current requirement.
2. No eligibility or approval decisions. Never say someone qualifies, will be approved, or can afford something. Explain the general requirements and suggest Phuong review their situation.
3. No applications and no sensitive data. Don't ask for and don't accept Social Security numbers, dates of birth, account numbers, income or asset details, or documents. If a visitor shares any, tell them not to share that in chat and point them to the "Talk to Phuong" form or the secure Get Pre-Approved application.
4. No legal or tax advice. Suggest an attorney or tax professional.
5. Fair lending: treat every visitor the same. Never ask about or comment on race, color, religion, national origin, sex, sexual orientation, gender identity, familial status, disability, age, marital status, or receipt of public assistance as a factor, and never discourage anyone from applying.
6. Don't name other lenders or compare them. Don't promise speed, savings, or outcomes.
7. MSF National DPA is a down payment assistance program offered through Mortgage Solutions Financial. You don't have its terms; say Phuong can explain how it works for them.
8. Stay on topic: home financing and buying. Politely decline anything else.
9. If asked whether you're a person: you are an AI assistant, not Phuong.

Style
- Plain, warm, brief: usually under 120 words. Short paragraphs or a few bullets. No headings.
- Answer in the visitor's language.
- When the question turns personal, detailed, or ready-to-act, end by offering the "Talk to Phuong" button or the "Get Pre-Approved" button.`;

// Anything that looks like a money figure, percentage, or rate. Used as a final safety net.
const NUMBER_RISK = /\$\s?\d|\d[\d,.]*\s?(%|percent\b|basis points|bps\b)|\bAPR\b[^.]*\d|\d[\d,.]*\s?(dollars|k\b)/i;
// "No down payment" style claims are down payment statements too (Reg Z triggering-term territory).
const ZERO_DOWN_RISK = /\b(no|zero|nothing)\s+(money\s+)?down\b|\bno\s+down\s?payment|(doesn'?t|does not|don'?t|do not)\s+(require|need)\s+(a|any)\s+down\s?payment|\bfull financing\b|sin\s+(pago inicial|enganche|dinero)|no\s+(requiere|necesita)\s+(un\s+|ning[uú]n\s+)?(pago inicial|enganche)/i;
const RISKY = (t) => NUMBER_RISK.test(t) || ZERO_DOWN_RISK.test(t);

const SAFE_FALLBACK =
  "I can't share specific figures like rates, payments, or percentages here. Those depend on your situation and change often. Phuong can walk you through the current numbers: tap \"Talk to Phuong\" or \"Get Pre-Approved\" below.";

function cleanHistory(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS).trim() }))
    .filter((m) => m.content)
    .slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

function extract(message) {
  let text = '';
  const sources = new Map();
  for (const block of message.content) {
    if (block.type !== 'text') continue;
    text += block.text;
    for (const c of block.citations || []) {
      if (c.url && !sources.has(c.url)) sources.set(c.url, c.title || c.url);
    }
  }
  // No inline citations: fall back to the pages the search returned.
  if (!sources.size) {
    for (const block of message.content) {
      if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
      for (const r of block.content) if (r.url && !sources.has(r.url)) sources.set(r.url, r.title || r.url);
    }
  }
  return { text: text.trim(), sources: [...sources].slice(0, 4).map(([url, title]) => ({ url, title })) };
}

async function ask(client, messages) {
  let convo = messages;
  for (let i = 0; i < 3; i++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3, allowed_domains: SOURCES }],
      messages: convo,
    });
    // Long searches can pause; hand the partial turn back so the model can continue.
    if (response.stop_reason === 'pause_turn') {
      convo = [...convo, { role: 'assistant', content: response.content }];
      continue;
    }
    const u = response.usage || {};
    console.log('winston usage', JSON.stringify({
      in: u.input_tokens, cacheRead: u.cache_read_input_tokens, out: u.output_tokens,
      searches: (u.server_tool_use && u.server_tool_use.web_search_requests) || 0,
    }));
    return response;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(503).json({ error: 'Winston is offline right now.' });
  }

  const messages = cleanHistory((req.body || {}).messages);
  if (!messages) return res.status(400).json({ error: 'Bad conversation.' });

  const hour = Math.floor(Date.now() / 3600000);
  if (!(await underLimit(`rl:ai:${clientIp(req)}:${hour}`, HOURLY_LIMIT, 3600))) {
    return res.status(429).json({ error: "You've reached the chat limit for now. Please use the Talk to Phuong form." });
  }

  const client = new Anthropic();
  try {
    let response = await ask(client, messages);
    if (!response || response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: "I can't help with that one here. Phuong can: tap \"Talk to Phuong\" below.", sources: [] });
    }
    let { text, sources } = extract(response);

    // Safety net: if a figure slipped through, ask once for a rewrite without numbers.
    if (RISKY(text)) {
      const retry = await ask(client, [
        ...messages,
        {
          role: 'system',
          content: `Your draft answer to this message included a specific figure (money, percentage, or rate) or a no/zero-down-payment claim, which hard rule 1 forbids. Answer again without any figures or down payment claims. Draft for reference:\n\n${text}`,
        },
      ]);
      const rewritten = retry && retry.stop_reason !== 'refusal' ? extract(retry).text : '';
      text = rewritten && !RISKY(rewritten) ? rewritten : SAFE_FALLBACK;
      if (text === SAFE_FALLBACK) sources = [];
    }

    return res.status(200).json({ reply: text || SAFE_FALLBACK, sources });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error('Anthropic rate limit:', err.message);
      return res.status(503).json({ error: 'Winston is busy. Try again in a minute.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${err.status}:`, err.message);
    } else {
      console.error('chat error:', err);
    }
    return res.status(500).json({ error: 'Winston hit a snag. Please try again or use the Talk to Phuong form.' });
  }
};
