// Quill's AI writing service: a Netlify Function at /api/ai.
// The page says what it wants written (a draft or a quick fix); this function builds the prompt, asks Claude with
// the site's own key (ANTHROPIC_API_KEY) and streams the text back as it is written. The page never sends a prompt
// of its own, so the key can only be used for Quill's writing help.
import { createHash, timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

export const config = { path: '/api/ai' };

const MODEL = process.env.QUILL_MODEL || 'claude-opus-5-5';
// Short emails don't need deep thinking, and low effort keeps replies quick enough for a function's time limit.
const EFFORT = process.env.QUILL_EFFORT || 'low';
// Models that take output_config.effort, and the ones that take the server-side refusal fallback.
const TAKES_EFFORT = /^claude-(opus-5|sonnet-5|fable-5|haiku-5-5)/;
const TAKES_FALLBACK = /^claude-(opus-5-5|opus-5|sonnet-5-5|fable-5-1|fable-5)$/;

// Keep these in step with the prompts in public/index.html, which Quill uses when it runs on claude.ai.
const SYSTEM = 'You write and edit email text inside Quill, the user’s email app. Reply with the email body only, as plain text: no subject line, no sign-off or signature (Quill adds the user’s signature), and no notes about what you did.';
const TONE = {
  professional: 'Professional: a formal greeting such as "Hi Dana," and a clear, courteous voice.',
  personal: 'Personal: relaxed and warm, with contractions and a casual greeting such as "Hey Dana!".',
};
const LENGTH = { short: 'Short: one or two sentences.', medium: 'Medium: a short paragraph or two.', detailed: 'Detailed: a few paragraphs that cover the specifics.' };
const FIXES = {
  shorter: 'Make it shorter. Cut filler and keep every fact, date and request.',
  friendly: 'Make it warmer and more friendly, still right for the recipient.',
  formal: 'Make it more formal and polished.',
  grammar: 'Fix spelling, grammar and punctuation only. Keep the wording otherwise.',
};
const LANGUAGES = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese (Simplified)'];
// Generous for email, small enough that the service can't be used to send whole documents through Claude.
const LIMIT = { ask: 2000, body: 20000, name: 200, subject: 400 };

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const fail = (status, error, message) => ({ status, error, message });
const sameCode = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// Browsers send Origin on POST; a request from another site's page is refused.
function fromThisSite(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch (e) { return false; }
}

// Check what the page asked for and turn it into a prompt. Anything unexpected is refused, never trimmed to fit.
function readTask(input) {
  if (!input || typeof input !== 'object') return fail(400, 'bad_request', 'Send a JSON object.');
  const too = (v, n, what) => (v.length > n ? fail(413, 'too_long', `The ${what} is too long for the assistant.`) : null);
  if (input.kind === 'draft') {
    const style = TONE[input.style] ? input.style : 'professional';
    const length = LENGTH[input.length] ? input.length : 'medium';
    const ask = text(input.ask), to = text(input.to);
    if (!ask) return fail(400, 'empty', 'Say what the email should say.');
    const reply = input.reply && typeof input.reply === 'object' ? { from: text(input.reply.from), subject: text(input.reply.subject), body: text(input.reply.body) } : null;
    const over = too(ask, LIMIT.ask, 'request') || too(to, LIMIT.name, 'recipient name')
      || (reply && (too(reply.from, LIMIT.name, 'sender name') || too(reply.subject, LIMIT.subject, 'subject') || too(reply.body, LIMIT.body, 'email you’re replying to')));
    if (over) return over;
    return {
      prompt: [
        'Write the body of an email. Start with a greeting and stop before the sign-off.',
        'Tone: ' + TONE[style],
        'Length: ' + LENGTH[length],
        to ? `The recipient is ${to}.` : '',
        reply && reply.body ? `This replies to an email from ${reply.from || 'the recipient'} with the subject "${reply.subject}":\n"""\n${reply.body}\n"""` : '',
        'What the user wants to say:\n"""\n' + ask + '\n"""',
      ].filter(Boolean).join('\n\n'),
    };
  }
  if (input.kind === 'fix') {
    const body = text(input.body);
    if (!body) return fail(400, 'empty', 'There’s no message to change yet.');
    const over = too(body, LIMIT.body, 'message');
    if (over) return over;
    let ask = FIXES[input.fix];
    if (input.fix === 'translate') {
      if (!LANGUAGES.includes(input.language)) return fail(400, 'bad_request', 'Pick a language from the list.');
      ask = `Translate it into ${input.language}.`;
    }
    if (!ask) return fail(400, 'bad_request', 'Unknown quick fix.');
    return { prompt: `Rewrite this email body. ${ask} Keep names, dates and numbers.\n\n"""\n${body}\n"""` };
  }
  return fail(400, 'bad_request', 'Unknown task.');
}

// What went wrong, in words the page can show. Most specific first: in this SDK a connection error is also an APIError.
function explain(e) {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { code: 'not_configured', message: 'The AI service’s API key was refused.' };
  if (e instanceof Anthropic.NotFoundError) return { code: 'not_configured', message: 'The model set for the AI service wasn’t found.' };
  if (e instanceof Anthropic.RateLimitError) return { code: 'busy', message: 'Claude is getting too many requests from this site. Try again in a minute.' };
  if (e instanceof Anthropic.APIConnectionError) return { code: 'network', message: 'The AI service couldn’t reach Claude.' };
  if (e instanceof Anthropic.InternalServerError) return { code: 'busy', message: 'Claude is busy right now. Try again in a moment.' };
  return { code: 'failed', message: 'Claude couldn’t write that just now.' };
}

let client = null;

export default async (req) => {
  // The page asks first whether the service is set up, and whether it wants an access code.
  if (req.method === 'GET') return json({ ready: !!process.env.ANTHROPIC_API_KEY, code: !!process.env.AI_ACCESS_CODE });
  if (req.method !== 'POST') return json({ error: 'method', message: 'Use GET or POST.' }, 405, { allow: 'GET, POST' });
  if (!fromThisSite(req)) return json({ error: 'forbidden', message: 'Requests must come from this site.' }, 403);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'not_configured', message: 'The AI service has no API key yet.' }, 503);
  const code = process.env.AI_ACCESS_CODE;
  if (code && !sameCode(req.headers.get('x-quill-code') || '', code)) return json({ error: 'bad_code', message: 'The access code is missing or wrong.' }, 401);
  if (Number(req.headers.get('content-length') || 0) > 100000) return json({ error: 'too_long', message: 'That request is too large.' }, 413);

  let input;
  try { input = await req.json(); } catch (e) { return json({ error: 'bad_request', message: 'Send JSON.' }, 400); }
  const task = readTask(input);
  if (task.error) return json({ error: task.error, message: task.message }, task.status);

  client = client || new Anthropic({ maxRetries: 1 });
  const params = { model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content: task.prompt }] };
  if (TAKES_EFFORT.test(MODEL)) params.output_config = { effort: EFFORT };
  // If Claude's safety checks decline, the API retries on the model Anthropic recommends for that case.
  if (TAKES_FALLBACK.test(MODEL)) Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  const stream = client.beta.messages.stream(params);

  // One JSON object per line: {"t":"text","v":"…"} as Claude writes, then {"t":"done"} or {"t":"error",…}.
  // A fallback continues the same text, so the page simply keeps appending.
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(out) {
      const send = (o) => { try { out.enqueue(enc.encode(JSON.stringify(o) + '\n')); } catch (e) { /* the page went away */ } };
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') send({ t: 'text', v: ev.delta.text });
        }
        const msg = await stream.finalMessage();
        if (msg.stop_reason === 'refusal') send({ t: 'error', code: 'refusal', message: 'Claude didn’t write this one. Try rewording what to say.' });
        else send({ t: 'done', stop: msg.stop_reason });
      } catch (e) {
        if (!(e instanceof Anthropic.APIUserAbortError)) {
          console.error('Quill AI request failed:', e && e.status, e && e.message);
          send({ t: 'error', ...explain(e) });
        }
      }
      try { out.close(); } catch (e) { /* already closed */ }
    },
    cancel() { stream.abort(); },
  });
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
};
