import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiHandler, createRateLimiter } from '../api/gemini.js';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
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

const okResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
});

const quietConsole = async (fn) => {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
};

test('falls back to the backup model when the primary model times out', async () => {
  const models = [];
  const fetchImpl = (url, init) => {
    const model = url.split('/models/')[1].split(':')[0];
    models.push(model);
    if (model === 'gemini-3.8-flash') {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }
    return Promise.resolve(okResponse({ intent: 'SCAM', confidence_score: 91, summary: 'KYC scam.' }));
  };
  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'k' }, fetchImpl, timeoutMs: 10, backupTimeoutMs: 500 });
  const res = createMockRes();
  await quietConsole(() => handler({ method: 'POST', body: { prompt: 'Update KYC now' } }, res));

  assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.model, 'gemini-3.5-flash-lite');
  assert.equal(res.body.confidence_score, 91);
});

test('falls back to the backup model on 429/500 errors from the primary model', async () => {
  for (const status of [429, 500, 503]) {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status, text: async () => 'overloaded' };
      return okResponse({ intent: 'CIVIC', confidence_score: 90, summary: 'Pipe leak.' });
    };
    const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'k' }, fetchImpl });
    const res = createMockRes();
    await quietConsole(() => handler({ method: 'POST', body: { prompt: 'Water pipe broken' } }, res));
    assert.equal(calls, 2, `status ${status} should try backup`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intent, 'CIVIC');
  }
});

test('GEMINI_MODEL and GEMINI_BACKUP_MODEL env vars override the default models', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return { ok: false, status: 500, text: async () => 'x' };
  };
  const handler = createGeminiHandler({
    env: { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'model-a', GEMINI_BACKUP_MODEL: 'model-b' },
    fetchImpl,
  });
  const res = createMockRes();
  await quietConsole(() => handler({ method: 'POST', body: { prompt: 'hi' } }, res));
  assert.ok(urls[0].includes('/model-a:'));
  assert.ok(urls[1].includes('/model-b:'));
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.fallback, true);
});

test('empty model output is treated as a failure and the backup is tried', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1
      ? { ok: true, status: 200, json: async () => ({ candidates: [] }) }
      : okResponse({ intent: 'SCAM', confidence_score: 10, summary: 'Safe.' });
  };
  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'k' }, fetchImpl });
  const res = createMockRes();
  await quietConsole(() => handler({ method: 'POST', body: { prompt: 'Good morning' } }, res));
  assert.equal(calls, 2);
  assert.equal(res.statusCode, 200);
});

test('rejects non-POST methods with 405 and an Allow header', async () => {
  const handler = createGeminiHandler({
    env: { GEMINI_API_KEY: 'k' },
    fetchImpl: async () => {
      throw new Error('not called');
    },
  });
  for (const method of ['GET', 'PUT', 'DELETE', undefined]) {
    const res = createMockRes();
    await handler({ method, body: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'POST');
  }
});

test('rate limiter blocks the 21st request in a window and resets afterwards', () => {
  let now = 0;
  const allow = createRateLimiter(20, 60_000, () => now);
  for (let i = 0; i < 20; i += 1) assert.equal(allow('1.2.3.4'), true);
  assert.equal(allow('1.2.3.4'), false);
  assert.equal(allow('5.6.7.8'), true, 'other clients are unaffected');
  now = 60_000;
  assert.equal(allow('1.2.3.4'), true);
});

test('handler returns 429 with Retry-After when the rate limiter refuses', async () => {
  const handler = createGeminiHandler({ env: { GEMINI_API_KEY: 'k' }, rateLimiter: () => false });
  const res = createMockRes();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' }, body: { prompt: 'hi' } }, res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['retry-after'], '60');
  assert.equal(res.body.fallback, true);
});
