import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');

function loadAppRuntime({ online = true, fetchImpl } = {}) {
  const elements = new Map();
  const busNodes = ['vani', 'gemini', 'kavach', 'urimai', 'netra', 'setu'].map((bus) => {
    const classes = new Set(['bus-node']);
    const attrs = {};
    return {
      dataset: { bus },
      classList: {
        toggle(cls, force) {
          const on = force === undefined ? !classes.has(cls) : Boolean(force);
          if (on) classes.add(cls);
          else classes.delete(cls);
          return on;
        },
        contains(cls) {
          return classes.has(cls);
        },
      },
      setAttribute(k, v) { attrs[k] = String(v); },
      removeAttribute(k) { delete attrs[k]; },
      getAttribute(k) { return attrs[k] ?? null; },
    };
  });

  function makeEl(id = '') {
    const classes = new Set();
    const attrs = {};
    return {
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
      classList: {
        add(...items) { items.forEach((c) => classes.add(c)); },
        remove(...items) { items.forEach((c) => classes.delete(c)); },
        toggle(c, force) {
          const on = force === undefined ? !classes.has(c) : Boolean(force);
          if (on) classes.add(c);
          else classes.delete(c);
          return on;
        },
        contains(c) { return classes.has(c); },
      },
      setAttribute(k, v) { attrs[k] = String(v); },
      removeAttribute(k) { delete attrs[k]; },
      getAttribute(k) { return attrs[k] ?? null; },
      addEventListener() {},
      removeEventListener() {},
      focus() {},
      scrollIntoView() {},
      appendChild() {},
      append() {},
      replaceChildren() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
    };
  }

  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  };

  // Load real core.js and i18n.js in the VM so fallback enrichment matches the browser
  const i18nCode = fs.readFileSync(path.join(ROOT, 'public', 'i18n.js'), 'utf8');
  const coreCode = fs.readFileSync(path.join(ROOT, 'public', 'core.js'), 'utf8');
  const scamTypesCode = fs.readFileSync(path.join(ROOT, 'public', 'scamtypes.js'), 'utf8');
  const appCode = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');

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
      querySelectorAll: (sel) => (sel === '#agentBus .bus-node' ? busNodes : []),
      addEventListener() {},
      removeEventListener() {},
      contains: () => true,
    },
  };

  sandbox.window = sandbox;
  sandbox.window.ChatSafeSound = {
    muted: false,
    play() {},
    playDtmf() {},
    toggle() { return false; },
    stopAll() {},
  };
  sandbox.window.createKavach = () => ({
    mood: 'idle',
    setMood(m) { this.mood = m; },
    setState() {},
    setDark() {},
    resetView() {},
    pulse() {},
  });
  sandbox.window.createBackground = () => ({ setColor() {} });
  sandbox.window.createHistory = () => ({
    currentId: 'c1',
    add() {},
    search() { return []; },
    startNew() {},
    clear() {},
    exportJson() { return '[]'; },
  });
  sandbox.window.KAVACH_MOOD_COLORS = {
    idle: [34, 211, 238],
    safe: [16, 185, 129],
    civic: [59, 130, 246],
    suspicious: [245, 158, 11],
    critical: [239, 68, 68],
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(i18nCode, context);
  vm.runInContext(coreCode, context);
  vm.runInContext(scamTypesCode, context);

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

  vm.runInContext(appCode, context);
  return { context, busNodes, elements };
}

test('Local fallback classifier deterministically covers all 8 Kavach scam types', () => {
  const { context } = loadAppRuntime();
  const { classify } = context.window.ChatSafeFallback;

  const scamCases = [
    ['digital arrest', 'My CBI officer is calling me for digital arrest and asking ₹1,50,000 transfer'],
    ['kyc / otp', 'Dear customer, your SBI KYC expired and account will be blocked today. Share OTP now or install update.apk'],
    ['fake investment', 'Welcome to SEBI VIP Stock Tips group! Guaranteed returns of 8% daily, deposit ₹25,000 to rajesh.trader@ybl'],
    ['courier / parcel', 'FedEx customs: a parcel in your name has MDMA drugs and passports seized. Press 1 immediately.'],
    ['electricity bill', 'Urgent: your electricity bill is unpaid and TNEB power connection will be disconnected tonight at 9:30 PM. Call 9876543210.'],
    ['task job', 'Part time work from home job! Like YouTube videos and earn ₹3000 daily after ₹500 prepaid task.'],
    ['reward bill', 'Congratulations! You won KBC lottery prize of ₹25 lakh. Pay processing fee ₹8,500 to claim.'],
    ['family voice cloning', 'Amma this is my new number, my voice is hoarse after an accident near hospital, urgent send ₹40,000, do not tell papa.'],
  ];

  for (const [label, prompt] of scamCases) {
    const out = classify(prompt);
    assert.ok(out, `Expected match for ${label}`);
    assert.equal(out.intent, 'SCAM', `Expected SCAM intent for ${label}`);
    assert.ok(out.confidence_score >= 66, `Expected high risk score >= 66 for ${label}, got ${out.confidence_score}`);
    assert.ok(out.action_draft.includes('1930'), `Expected 1930 draft for ${label}`);
    assert.ok(out.checklist.length >= 2, `Expected actionable checklist for ${label}`);
    assert.ok(out.active_agents.includes('kavach'), `Expected kavach badge for ${label}`);
    assert.ok(out.active_agents.includes('netra'), `Expected netra badge for ${label}`);
    assert.ok(!out.active_agents.includes('urimai'), `Expected no urimai badge for ${label}`);
  }
});

test('Local fallback classifier deterministically covers all 5 Urimai civic categories & safe guardrails', () => {
  const { context } = loadAppRuntime();
  const { classify } = context.window.ChatSafeFallback;

  const civicCases = [
    ['water pipe', 'Panchayat water pipe broke 3 days ago on our street'],
    ['damaged road', 'Main road near temple has deep broken potholes causing accidents'],
    ['street light', 'The street light near Ward 4 bus stop has not been working for a week'],
    ['sanitation', 'Sewage drainage overflow and garbage pile causing mosquitoes near school'],
    ['municipal petition', 'Submitting a formal municipal petition to the gram sabha ward office for ration shop repair'],
  ];

  for (const [label, prompt] of civicCases) {
    const out = classify(prompt);
    assert.ok(out, `Expected civic match for ${label}`);
    assert.equal(out.intent, 'CIVIC', `Expected CIVIC intent for ${label}`);
    assert.ok(out.confidence_score >= 85, `Expected high confidence for ${label}`);
    assert.ok(out.action_draft.length > 40, `Expected formal petition draft for ${label}`);
    assert.ok(out.checklist.length >= 2, `Expected civic checklist for ${label}`);
    assert.deepEqual([...out.active_agents], ['vani', 'gemini', 'urimai', 'setu']);
  }

  // Quick-prompt chips & edge cases
  const chipReal = classify('Is this caller really from my bank?');
  assert.equal(chipReal.intent, 'SCAM');
  assert.ok(chipReal.confidence_score >= 26 && chipReal.confidence_score <= 65, 'Bank verification question should be moderate warning');

  const chipArrest = classify('What is a digital arrest?');
  assert.equal(chipArrest.intent, 'SCAM');
  assert.ok(chipArrest.confidence_score >= 66, 'Digital arrest education prompt should light Kavach alert');

  const chipWater = classify('Panchayat water pipe broke 3 days ago');
  assert.equal(chipWater.intent, 'CIVIC');
  assert.deepEqual([...chipWater.active_agents], ['vani', 'gemini', 'urimai', 'setu']);

  const safeCases = [
    'Hi Amma, reached Chennai safely. Will call you after dinner.',
    'Your OTP for Swiggy order is 482913. Do not share it with anyone.',
    'Your electricity bill of ₹1,240 is due on 20 Nov. Pay on the official TNEB app.',
  ];
  for (const prompt of safeCases) {
    const out = classify(prompt);
    assert.ok(out, `Expected safe guardrail match for "${prompt}"`);
    assert.equal(out.intent, 'SCAM');
    assert.ok(out.confidence_score <= 25, `Expected safe score <= 25, got ${out.confidence_score}`);
    assert.equal(out.action_draft, '');
  }
});

test('analyzeIntent routes via POST /api/gemini and seamlessly falls back on 503, timeout, and offline', async () => {
  let seenCalls = [];
  const liveRuntime = loadAppRuntime({
    online: true,
    fetchImpl: async (url, init) => {
      seenCalls.push({ url, init });
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          intent: 'CIVIC',
          confidence_score: 97,
          active_agents: ['vani', 'gemini', 'urimai', 'setu'],
          summary: 'Proxy verified Urimai civic breakdown.',
          action_draft: 'Official Proxy Civic Draft',
          checklist: ['Upload street photo', 'Submit via CM Helpline'],
        }),
      };
    },
  });

  const liveRes = await liveRuntime.context.window.ChatSafeFallback.analyzeIntent('Panchayat water pipe broke', { mode: 'auto_demo' });
  assert.equal(seenCalls.length, 1);
  assert.equal(seenCalls[0].url, '/api/gemini');
  assert.equal(seenCalls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(seenCalls[0].init.body), {
    prompt: 'Panchayat water pipe broke',
    language: 'ta',
    mode: 'auto_demo',
  });
  assert.equal(liveRes._source, 'vercel-proxy');
  assert.equal(liveRes.intent, 'CIVIC');
  assert.equal(liveRes.summary, 'Proxy verified Urimai civic breakdown.');

  // 503 fallback test
  const fallback503Runtime = loadAppRuntime({
    online: true,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Unavailable', fallback: true }),
    }),
  });
  const res503 = await fallback503Runtime.context.window.ChatSafeFallback.analyzeIntent(
    'My CBI officer is calling me for digital arrest',
    { mode: 'speed_dial_9' },
  );
  assert.equal(res503._proxyFallback, true);
  assert.equal(res503.intent, 'SCAM');
  assert.ok(res503.confidence_score >= 90);

  // Network reject / abort fallback test
  const timeoutRuntime = loadAppRuntime({
    online: true,
    fetchImpl: async () => { throw new DOMException('Aborted', 'AbortError'); },
  });
  const resTimeout = await timeoutRuntime.context.window.ChatSafeFallback.analyzeIntent('Main road has deep potholes', { mode: 'chat' });
  assert.equal(resTimeout._proxyFallback, true);
  assert.equal(resTimeout.intent, 'CIVIC');

  // Offline fallback test (does not call fetch)
  let offlineFetched = false;
  const offlineRuntime = loadAppRuntime({
    online: false,
    fetchImpl: async () => { offlineFetched = true; throw new Error('Should not fetch'); },
  });
  const resOffline = await offlineRuntime.context.window.ChatSafeFallback.analyzeIntent('FedEx customs seized parcel with drugs', { mode: 'voice' });
  assert.equal(offlineFetched, false);
  assert.equal(resOffline._offlineFallback, true);
  assert.equal(resOffline.intent, 'SCAM');
  assert.ok(resOffline.confidence_score >= 90);
});
