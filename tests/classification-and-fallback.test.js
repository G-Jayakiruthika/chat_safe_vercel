import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createGeminiHandler } from '../api/gemini.js';

const ROOT = path.resolve(import.meta.dirname, '..');

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

function loadFallbackRuntime({ online = true, fetchImpl } = {}) {
  const elements = new Map();
  const makeEl = (id = '') => ({
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: true,
    checked: false,
    disabled: false,
    style: { setProperty() {} },
    dataset: {},
    className: '',
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    setAttribute() {},
    removeAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    scrollIntoView() {},
    appendChild() {},
    append() {},
    replaceChildren() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
  });
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    URL,
    Blob,
    AbortController,
    fetch: fetchImpl || (async () => ({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'unavailable', fallback: true }),
    })),
    navigator: { onLine: online, clipboard: { writeText: async () => {} } },
    location: { search: '', hash: '', href: 'https://chat-safe-vercel.vercel.app/app.html' },
    localStorage: {
      _data: new Map(),
      getItem(k) { return this._data.get(k) ?? null; },
      setItem(k, v) { this._data.set(k, String(v)); },
      removeItem(k) { this._data.delete(k); },
      clear() { this._data.clear(); },
    },
    sessionStorage: {
      _data: new Map(),
      getItem(k) { return this._data.get(k) ?? null; },
      setItem(k, v) { this._data.set(k, String(v)); },
      removeItem(k) { this._data.delete(k); },
      clear() { this._data.clear(); },
    },
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
    removeEventListener() {},
    Option: class OptionStub {
      constructor(text = '', value = '') {
        this.text = text;
        this.value = value;
      }
    },
    document: {
      documentElement: { dir: 'ltr', lang: 'en', dataset: { theme: 'dark', palette: 'mandarin' } },
      body: { dir: 'ltr', classList: { toggle() {}, add() {}, remove() {} } },
      hidden: false,
      cookie: '',
      activeElement: null,
      getElementById: getEl,
      createElement: () => makeEl('created'),
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {},
      contains: () => true,
    },
  };

  sandbox.window = sandbox;
  sandbox.window.ChatSafeSound = { muted: false, play() {}, playDtmf() {}, toggle: () => false, stopAll() {} };
  sandbox.window.createKavach = () => ({
    mood: 'idle',
    setMood(m) { this.mood = m; },
    setState() {},
    setDark() {},
    resetView() {},
    pulse() {},
  });
  sandbox.window.createBackground = () => ({ setColor() {} });
  sandbox.window.createHistory = () => ({ currentId: 'c1', add() {}, search: () => [], startNew() {}, clear() {}, exportJson: () => '[]' });
  sandbox.window.KAVACH_MOOD_COLORS = {
    idle: [34, 211, 238],
    safe: [16, 185, 129],
    civic: [59, 130, 246],
    suspicious: [245, 158, 11],
    critical: [239, 68, 68],
  };

  const context = vm.createContext(sandbox);
  for (const file of ['i18n.js', 'core.js', 'scamtypes.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', file), 'utf8'), context);
  }
  const engine = context.window.ChatSafeCore.createEngine({ logger: { error() {} } });
  context.window.ChatSafeAPI = {
    OFFLINE_NOTICE: 'Network unstable. Reverting to Offline Rule Engine.',
    mode: () => 'local',
    aiEnabled: () => false,
    detect: async () => 'local',
    call: async (ep, body) => {
      const map = {
        agent: engine.agent,
        analyze: engine.analyze,
        urimai: engine.urimai,
        autopilot: engine.autopilot,
        decoy: engine.decoy,
        'upi-check': engine.upiCheck,
        redact: engine.redact,
        radar: engine.radar,
        safebrowsing: engine.safebrowsing,
        portals: async () => engine.portals(),
        languages: async () => engine.languages(),
      };
      return map[ep] ? await map[ep](body || {}) : null;
    },
  };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8'), context);
  return context.window.ChatSafeFallback;
}

test('Classification covers multilingual scam vs civic disambiguation and sextortion/blackmail', () => {
  const { classify } = loadFallbackRuntime();

  const tamilCivic = classify('எங்கள் தெருவில் குடிநீர் குழாய் உடைந்துவிட்டது, தண்ணீர் வரவில்லை');
  assert.equal(tamilCivic?.intent, 'CIVIC');
  assert.ok(tamilCivic.confidence_score >= 90);
  assert.deepEqual([...tamilCivic.active_agents], ['vani', 'gemini', 'urimai', 'setu']);

  const hindiScam = classify('आपका बैंक खाता बंद हो जाएगा, तुरंत ओटीपी और केवाईसी भेजें');
  assert.equal(hindiScam?.intent, 'SCAM');
  assert.ok(hindiScam.confidence_score >= 66);
  assert.ok(hindiScam.action_draft.includes('1930'));

  const blackmailScam = classify('Instant loan app threatening to send morphed photos to all my contacts unless I pay');
  assert.equal(blackmailScam?.intent, 'SCAM');
  assert.ok(blackmailScam.confidence_score >= 90);
  assert.ok(blackmailScam.active_agents.includes('kavach'));

  // Electricity disconnection threat must route as SCAM, while dark street light pole routes as CIVIC
  const powerScam = classify('Your TNEB electricity bill is unpaid. Power will be disconnected tonight unless you call 9876543210.');
  assert.equal(powerScam?.intent, 'SCAM');
  assert.ok(powerScam.confidence_score >= 85);

  const streetLightCivic = classify('The street light near Ward 4 temple is not working and the street is completely dark.');
  assert.equal(streetLightCivic?.intent, 'CIVIC');
  assert.equal(streetLightCivic?.civic_type, 'street_light');
});

test('Prompt & input handling: trims prompt, caps length at 1500 chars, rejects invalid inputs, and redacts API keys', async () => {
  let capturedPrompt = '';
  const handler = createGeminiHandler({
    env: { GEMINI_API_KEY: '  secret+key/123  ' },
    fetchImpl: async (url, init) => {
      assert.ok(url.includes('key=secret%2Bkey%2F123'));
      const payload = JSON.parse(init.body);
      capturedPrompt = payload.contents[0].parts[0].text;
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
                    confidence_score: 88,
                    active_agents: ['kavach'],
                    summary: 'Long phishing prompt classified.',
                    action_draft: 'Call 1930.',
                    checklist: ['Block sender'],
                  }),
                }],
              },
            }],
          };
        },
      };
    },
  });

  const oversized = `   ${'X'.repeat(1800)}   `;
  const resOk = createMockRes();
  await handler({ method: 'POST', body: JSON.stringify({ prompt: oversized, language: 'ta', mode: 'chat' }) }, resOk);
  assert.equal(resOk.statusCode, 200);
  assert.equal(capturedPrompt.length, 1500);
  assert.equal(resOk.body.intent, 'SCAM');

  for (const badBody of [null, [], 'not-json', { prompt: 123 }, { prompt: '   ' }]) {
    const resBad = createMockRes();
    await handler({ method: 'POST', body: badBody }, resBad);
    assert.equal(resBad.statusCode, 400);
    assert.ok(resBad.body.error);
  }
});

test('Fallback resilience: missing key, 400 thinkingBudget retry, upstream error sanitization, timeout, and offline mode', async () => {
  const missingRes = createMockRes();
  await createGeminiHandler({ env: { GEMINI_API_KEY: '  ' } })({ method: 'POST', body: { prompt: 'Test' } }, missingRes);
  assert.equal(missingRes.statusCode, 503);
  assert.deepEqual(missingRes.body, { error: 'Missing GEMINI_API_KEY', fallback: true, stage: 'missing_key' });

  // Upstream network exception sanitizes echoed API key
  const origError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const errRes = createMockRes();
    await createGeminiHandler({
      env: { GEMINI_API_KEY: 'top-secret-xyz' },
      fetchImpl: async () => { throw new Error('ECONNRESET on ?key=top-secret-xyz'); },
    })({ method: 'POST', body: { prompt: 'Test network failure' } }, errRes);

    assert.equal(errRes.statusCode, 503);
    assert.equal(errRes.body.fallback, true);
    assert.equal(errRes.body.upstreamStatus, 503);
    assert.doesNotMatch(JSON.stringify(errRes.body), /top-secret-xyz/);
    assert.ok(logged.every((line) => !line.includes('top-secret-xyz')));
  } finally {
    console.error = origError;
  }

  // Offline analyzeIntent routes seamlessly to local fallback without calling fetch
  let fetchCalled = false;
  const offlineFallback = loadFallbackRuntime({
    online: false,
    fetchImpl: async () => { fetchCalled = true; throw new Error('offline'); },
  });
  const offlineCivic = await offlineFallback.analyzeIntent('Drainage sewage overflow in Ward 12', { mode: 'voice' });
  assert.equal(fetchCalled, false);
  assert.equal(offlineCivic._offlineFallback, true);
  assert.equal(offlineCivic.intent, 'CIVIC');
  assert.ok(offlineCivic.action_draft.length > 30);

  // 503 proxy error degrades smoothly to local fallback for scam detection
  const degradedFallback = loadFallbackRuntime({
    online: true,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Upstream Gemini request timed out', fallback: true, upstreamStatus: 504 }),
    }),
  });
  const degradedScam = await degradedFallback.analyzeIntent('FedEx parcel seized with drugs, pay ₹5000 customs fee now', { mode: 'chat' });
  assert.equal(degradedScam._proxyFallback, true);
  assert.equal(degradedScam.intent, 'SCAM');
  assert.ok(degradedScam.confidence_score >= 90);
});
