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

test('POST /api/gemini returns clean 503 with fallback flag and zero secret leakage when key is missing', async () => {
  const handler = createGeminiHandler({ env: {} });
  const res = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'My CBI officer is calling me', language: 'en', mode: 'chat' } }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.fallback, true);
  assert.equal(res.body.statusCode, 503);
  const serialized = JSON.stringify(res.body);
  assert.doesNotMatch(serialized, /GEMINI_API_KEY/i);
  assert.doesNotMatch(serialized, /Error:|at\s+\w+\s+\(/);
});

test('POST /api/gemini returns clean 503 with upstream statusCode on failure and AbortController timeout', async () => {
  const failingUrls = [];
  const failingFetch = async (url) => {
    failingUrls.push(url);
    return { ok: false, status: 500, json: async () => ({}) };
  };
  const handlerErr = createGeminiHandler({ env: { GEMINI_API_KEY: 'test-secret' }, fetchImpl: failingFetch });
  const resErr = createMockRes();
  await handlerErr({ method: 'POST', body: { prompt: 'Test prompt' } }, resErr);
  assert.equal(resErr.statusCode, 503);
  assert.equal(resErr.body.fallback, true);
  assert.equal(resErr.body.statusCode, 500);
  assert.deepEqual(failingUrls, [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
  ]);
  assert.doesNotMatch(JSON.stringify(resErr.body), /test-secret|GEMINI_API_KEY/);

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
  assert.equal(resTimeout.body.fallback, true);
  assert.equal(resTimeout.body.statusCode, 504);
});

test('POST /api/gemini retries gemini-3.8-flash if gemini-3.5-flash-lite fails and returns 200 on recovery', async () => {
  const attempted = [];
  const retryFetch = async (url) => {
    attempted.push(url);
    if (url.includes('gemini-3.5-flash-lite')) {
      return { ok: false, status: 404, json: async () => ({}) };
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
                  confidence_score: 91,
                  active_agents: ['vani', 'gemini', 'kavach', 'netra'],
                  summary: 'Retry model classified phishing message.',
                  action_draft: 'Dial 1930 immediately.',
                  checklist: ['Do not click links', 'Call 1930'],
                }),
              }],
            },
          }],
        };
      },
    };
  };

  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'live-secret-value' }, fetchImpl: retryFetch });
  const res = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'Share OTP now', language: 'en', mode: 'chat' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(attempted, [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
  ]);
  assert.equal(res.body.intent, 'SCAM');
  assert.equal(res.body.confidence_score, 91);
});

test('POST /api/gemini calls Gemini 3.5 Flash-Lite server-side and normalizes SCAM & CIVIC structured JSON', async () => {
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, init });
    const userPayload = JSON.parse(init.body).contents[0].parts[0].text;
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

  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'live-secret-value' }, fetchImpl: mockFetch });

  const scamRes = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'My CBI officer is calling me for digital arrest', language: 'ta', mode: 'auto_demo' } }, scamRes);
  assert.equal(scamRes.statusCode, 200);
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'live-secret-value');
  assert.deepEqual(Object.keys(scamRes.body).sort(), [
    'active_agents',
    'action_draft',
    'checklist',
    'confidence_score',
    'intent',
    'summary',
  ].sort());
  assert.equal(scamRes.body.intent, 'SCAM');
  assert.equal(scamRes.body.confidence_score, 96);
  assert.ok(!scamRes.body.active_agents.includes('urimai'));
  assert.ok(scamRes.body.active_agents.includes('kavach'));

  const civicRes = createMockRes();
  await handler({ method: 'POST', body: { prompt: 'Panchayat water pipe broke', language: 'ta', mode: 'voice' } }, civicRes);
  assert.equal(civicRes.statusCode, 200);
  assert.equal(civicRes.body.intent, 'CIVIC');
  assert.equal(civicRes.body.confidence_score, 94);
  assert.ok(!civicRes.body.active_agents.includes('kavach'));
  assert.deepEqual(civicRes.body.active_agents, ['vani', 'gemini', 'urimai', 'setu']);
});

test('manifest.webmanifest specifies valid share_target enctype', () => {
  const manifestPath = path.resolve(import.meta.dirname, '..', 'public', 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.share_target.method, 'GET');
  assert.equal(manifest.share_target.enctype, 'application/x-www-form-urlencoded');
});
