import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createGeminiHandler } from '../api/gemini.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('POST /api/gemini returns 405 for non-POST methods with Allow header', async () => {
  const handler = createGeminiHandler({ env: {} });
  const res = createMockRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
  assert.match(res.body.error, /Method not allowed/i);
});

test('POST /api/gemini returns 400 on missing prompt, invalid JSON, or non-object body', async () => {
  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'dummy' } });

  const missingRes = createMockRes();
  await handler({ method: 'POST', body: { language: 'en', mode: 'chat' } }, missingRes);
  assert.equal(missingRes.statusCode, 400);

  const blankRes = createMockRes();
  await handler({ method: 'POST', body: { prompt: '   ' } }, blankRes);
  assert.equal(blankRes.statusCode, 400);

  const invalidJsonRes = createMockRes();
  await handler({ method: 'POST', body: '{bad-json' }, invalidJsonRes);
  assert.equal(invalidJsonRes.statusCode, 400);

  const bufferBadRes = createMockRes();
  await handler({ method: 'POST', body: Buffer.from('[]') }, bufferBadRes);
  assert.equal(bufferBadRes.statusCode, 400);
});

test('POST /api/gemini returns 503 with missing_key stage when GEMINI_API_KEY is missing or whitespace', async () => {
  for (const env of [{}, { GEMINI_API_KEY: '   \t\n  ' }]) {
    const handler = createGeminiHandler({ env });
    const res = createMockRes();
    await handler({ method: 'POST', body: { prompt: 'My CBI officer is calling me', language: 'en', mode: 'chat' } }, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, {
      error: 'Missing GEMINI_API_KEY',
      fallback: true,
      stage: 'missing_key',
    });
  }
});

test('POST /api/gemini logs exact upstream error safely and returns 503 diagnostics on failure or timeout', async () => {
  const attemptedUrls = [];
  const loggedErrors = [];
  const origConsoleError = console.error;
  console.error = (...args) => {
    loggedErrors.push(args.map((a) => String(a)).join(' '));
  };

  try {
    const longDetail = 'A'.repeat(450);
    const failingFetch = async (url) => {
      attemptedUrls.push(url);
      return {
        ok: false,
        status: 403,
        text: async () => JSON.stringify({
          error: {
            message: `API key test-secret&key=test-secret rejected: ${longDetail}`,
          },
        }),
      };
    };

    const handlerErr = createGeminiHandler({ env: { GEMINI_API_KEY: '  test-secret  ' }, fetchImpl: failingFetch });
    const resErr = createMockRes();
    await handlerErr({ method: 'POST', body: { prompt: 'Test prompt' } }, resErr);

    assert.equal(resErr.statusCode, 503);
    assert.equal(resErr.body.error, 'Live AI proxy error');
    assert.equal(resErr.body.fallback, true);
    assert.equal(resErr.body.upstreamStatus, 403);
    assert.ok(resErr.body.upstreamBody.length <= 400);
    assert.match(resErr.body.upstreamBody, /API key \[REDACTED\]/);
    assert.deepEqual(attemptedUrls, [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=test-secret',
    ]);
    assert.doesNotMatch(JSON.stringify(resErr.body), /test-secret|GEMINI_API_KEY/);
    assert.ok(loggedErrors.some((msg) => msg.includes('Gemini upstream failure:') && msg.includes('403') && !msg.includes('test-secret')));

    const slowFetch = (_url, opts) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
    const handlerTimeout = createGeminiHandler({
      env: { GEMINI_API_KEY: 'test-secret' },
      fetchImpl: slowFetch,
      timeoutMs: 15,
    });
    const resTimeout = createMockRes();
    await handlerTimeout({ method: 'POST', body: { prompt: 'Slow request' } }, resTimeout);

    assert.equal(resTimeout.statusCode, 503);
    assert.deepEqual(resTimeout.body, {
      error: 'Upstream Gemini request timed out',
      fallback: true,
      upstreamStatus: 504,
      upstreamBody: 'Upstream Gemini request timed out',
    });
    assert.ok(loggedErrors.includes('Gemini request timed out'));
    assert.ok(loggedErrors.some((msg) => msg.includes('Gemini upstream failure:') && msg.includes('504')));
  } finally {
    console.error = origConsoleError;
  }
});

test('api/gemini.js contains zero legacy model references and returns 200 on fenced JSON or plain text', async () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'api', 'gemini.js'), 'utf8');
  assert.doesNotMatch(source, /gemini-2\.5-flash|gemini-1\.5-flash/i);

  const makeHandler = (rawText) => createGeminiHandler({
    env: { GEMINI_API_KEY: 'live-secret-value' },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [{ content: { parts: [{ text: rawText }] } }],
        };
      },
    }),
  });

  const fencedRes = createMockRes();
  await makeHandler('```json\n{"intent":"SCAM","confidence_score":93,"active_agents":["kavach"],"summary":"Phishing detected.","action_draft":"Call 1930","checklist":["Hang up"]}\n```')(
    { method: 'POST', body: { prompt: 'Click KYC link now' } },
    fencedRes,
  );
  assert.equal(fencedRes.statusCode, 200);
  assert.equal(fencedRes.body.intent, 'SCAM');
  assert.equal(fencedRes.body.confidence_score, 93);
  assert.equal(fencedRes.body.model, 'gemini-3.8-flash');
  assert.match(fencedRes.body.text, /Phishing detected/);

  const plainRes = createMockRes();
  await makeHandler('Please report the broken water pipe on the municipal portal.')(
    { method: 'POST', body: { prompt: 'Broken water pipe on street' } },
    plainRes,
  );
  assert.equal(plainRes.statusCode, 200);
  assert.equal(plainRes.body.intent, 'CIVIC');
  assert.equal(plainRes.body.text, 'Please report the broken water pipe on the municipal portal.');
  assert.equal(plainRes.body.model, 'gemini-3.8-flash');

  const truncatedRes = createMockRes();
  await makeHandler('{"intent":"SCAM","confidence_score":94,"active_agents":["vani","gemini","kavach"],"summary":"Fake KYC link detected.","action_draft":"Report on 1930","checklist":["Do not cli')(
    { method: 'POST', body: { prompt: 'Click KYC link now' } },
    truncatedRes,
  );
  assert.equal(truncatedRes.statusCode, 200);
  assert.equal(truncatedRes.body.intent, 'SCAM');
  assert.equal(truncatedRes.body.confidence_score, 94);
  assert.equal(truncatedRes.body.summary, 'Fake KYC link detected.');
  assert.equal(truncatedRes.body.action_draft, 'Report on 1930');
});

test('POST /api/gemini trims & encodes API key, sends clean gemini-3.8-flash payload, and normalizes SCAM & CIVIC responses', async () => {
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, init });
    const parsedBody = JSON.parse(init.body);
    const userPayload = parsedBody.contents[0].parts[0].text;
    const isCivic = /water pipe/i.test(userPayload);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify(isCivic
                  ? {
                      intent: 'CIVIC',
                      confidence_score: 94.4,
                      active_agents: ['Vani IVR', 'Gemini Router', 'Urimai', 'Setu O2O', 'Kavach'],
                      summary: 'Water pipe breakage flagged for Municipal Water Board action.',
                      action_draft: 'To the Executive Officer, Municipal Water Board...',
                      checklist: ['Snap photo of broken pipe', 'Export Urimai PDF'],
                    }
                  : {
                      intent: 'SCAM',
                      confidence_score: 96,
                      active_agents: ['vani', 'gemini', 'kavach', 'netra', 'urimai'],
                      summary: 'Digital arrest impersonation fraud detected.',
                      action_draft: '1930 Cybercrime complaint draft...',
                      checklist: ['Hang up immediately', 'Dial 1930'],
                    }),
              }],
            },
          }],
        };
      },
    };
  };

  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: '  live+secret/value  ' }, fetchImpl: mockFetch });

  const scamRes = createMockRes();
  await handler({ method: 'POST', body: { prompt: '  My CBI officer is calling me for digital arrest  ', language: 'ta', mode: 'auto_demo' } }, scamRes);
  assert.equal(scamRes.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=live%2Bsecret%2Fvalue',
  );
  const sentBody = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(sentBody).sort(), ['contents', 'generationConfig', 'systemInstruction']);
  assert.deepEqual(sentBody.contents, [
    { role: 'user', parts: [{ text: 'My CBI officer is calling me for digital arrest' }] },
  ]);
  assert.deepEqual(sentBody.generationConfig, {
    thinkingConfig: { thinkingBudget: 0 },
    maxOutputTokens: 600,
    temperature: 0.3,
  });
  assert.ok(sentBody.systemInstruction.parts[0].text.length < 400);
  assert.deepEqual(Object.keys(scamRes.body).sort(), [
    'active_agents',
    'action_draft',
    'checklist',
    'confidence_score',
    'intent',
    'model',
    'summary',
    'text',
  ].sort());
  assert.equal(scamRes.body.intent, 'SCAM');
  assert.equal(scamRes.body.confidence_score, 96);
  assert.equal(scamRes.body.model, 'gemini-3.8-flash');
  assert.ok(scamRes.body.text.length > 0);
  assert.ok(!scamRes.body.active_agents.includes('urimai'));
  assert.ok(scamRes.body.active_agents.includes('kavach'));

  const civicRes = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'Panchayat water pipe broke', language: 'ta', mode: 'voice' } }, civicRes);
  assert.equal(civicRes.statusCode, 200);
  assert.equal(civicRes.body.intent, 'CIVIC');
  assert.equal(civicRes.body.confidence_score, 94);
  assert.equal(civicRes.body.model, 'gemini-3.8-flash');
  assert.ok(!civicRes.body.active_agents.includes('kavach'));
  assert.deepEqual(civicRes.body.active_agents, ['vani', 'gemini', 'urimai', 'setu']);
});

test('POST /api/gemini retries immediately without thinkingConfig if upstream returns 400 complaining about thinkingBudget', async () => {
  const bodies = [];
  const retryFetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    if (bodies.length === 1) {
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: 'Unknown name "thinkingBudget" at generationConfig.thinkingConfig' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  intent: 'SCAM',
                  confidence_score: 92,
                  active_agents: ['vani', 'gemini', 'kavach'],
                  summary: 'Retry succeeded without thinkingConfig.',
                  action_draft: 'Dial 1930.',
                  checklist: ['Do not share OTP'],
                }),
              }],
            },
          }],
        };
      },
    };
  };

  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'live-secret' }, fetchImpl: retryFetch });
  const res = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'Share OTP now' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0].generationConfig, { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 600, temperature: 0.3 });
  assert.deepEqual(bodies[1].generationConfig, { maxOutputTokens: 600, temperature: 0.3 });
  assert.equal(res.body.intent, 'SCAM');
  assert.equal(res.body.summary, 'Retry succeeded without thinkingConfig.');
});

test('manifest.webmanifest specifies valid share_target enctype', () => {
  const manifestPath = path.resolve(import.meta.dirname, '..', 'public', 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.share_target.method, 'GET');
  assert.equal(manifest.share_target.enctype, 'application/x-www-form-urlencoded');
});
