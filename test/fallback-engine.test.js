import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadEngine() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'fallbackEngine.js'), 'utf8'), sandbox);
  return sandbox.ChatSafeEngine;
}

const engine = loadEngine();

test('engine is frozen and exposes the public API', () => {
  assert.ok(Object.isFrozen(engine));
  for (const fn of [
    'getThreatTier',
    'normalizeBusAgents',
    'classifyLocalFallback',
    'buildLocal1930Draft',
    'buildLocalCivicDraft',
  ]) {
    assert.equal(typeof engine[fn], 'function', fn);
  }
});

test('getThreatTier maps score boundaries to safe / moderate / critical', () => {
  const cases = [
    [-10, 'safe', 0],
    [0, 'safe', 0],
    [25, 'safe', 25],
    [26, 'moderate', 26],
    [65, 'moderate', 65],
    [66, 'critical', 66],
    [100, 'critical', 100],
    [250, 'critical', 100],
    ['abc', 'safe', 0],
    [undefined, 'safe', 0],
  ];
  for (const [input, tier, score] of cases) {
    const result = engine.getThreatTier(input);
    assert.equal(result.tier, tier, `score ${input}`);
    assert.equal(result.score, score, `score ${input}`);
  }
});

test('normalizeBusAgents keeps civic and scam agent sets separate', () => {
  assert.deepEqual(
    [...engine.normalizeBusAgents(['Kavach', 'Urimai'], 'CIVIC', 90)],
    ['vani', 'gemini', 'urimai', 'setu'],
  );
  assert.deepEqual([...engine.normalizeBusAgents([], 'SCAM', 10)], ['vani', 'gemini', 'kavach']);
  assert.deepEqual([...engine.normalizeBusAgents([], 'SCAM', 50)], ['vani', 'gemini', 'kavach', 'netra']);
  assert.deepEqual(
    [...engine.normalizeBusAgents(['setu agent'], 'SCAM', 90)],
    ['vani', 'gemini', 'kavach', 'netra', 'setu'],
  );
  assert.deepEqual([...engine.normalizeBusAgents('not-an-array', 'SCAM', 0)], ['vani', 'gemini', 'kavach']);
});

test('classifyLocalFallback flags high-risk scams with a 1930 draft', () => {
  const scams = [
    'This is Inspector Sharma from CBI Mumbai. A FedEx parcel in your name has drugs. Stay on video call, do not tell family. Transfer ₹1,50,000 now.',
    'Welcome to SEBI VIP Stock Tips group! Guaranteed returns of 8% daily. Deposit ₹25,000 immediately. Join https://t.me/vipprofitclub',
  ];
  for (const text of scams) {
    const r = engine.classifyLocalFallback(text);
    assert.equal(r.intent, 'SCAM');
    assert.ok(r.confidence_score >= 66, text);
    assert.equal(r.tier.tier, 'critical');
    assert.match(r.action_draft, /1930/);
    assert.ok(r.threat_vectors.length > 0);
  }
});

test('classifyLocalFallback routes civic problems to an Urimai petition', () => {
  const r = engine.classifyLocalFallback(
    'The panchayat water pipe on my street in Ward 12 broke 3 days ago and no one is fixing it.',
    { location: 'Ward 12, Erode' },
  );
  assert.equal(r.intent, 'CIVIC');
  assert.ok(r.department);
  assert.match(r.action_draft, /Ward 12, Erode/);
  assert.match(r.action_draft, /Subject: Urgent Civic Grievance Petition/);
});

test('classifyLocalFallback keeps personal and safe OTP messages safe', () => {
  for (const text of [
    'Hi Amma, reached Chennai safely. Will call you after dinner.',
    'Your OTP is 482913. Do not share it with anyone.',
  ]) {
    const r = engine.classifyLocalFallback(text);
    assert.equal(r.intent, 'SCAM');
    assert.ok(r.confidence_score <= 25, text);
    assert.equal(r.action_draft, '');
  }
});

test('classifyLocalFallback returns null for unknown text so core.js can decide', () => {
  assert.equal(engine.classifyLocalFallback('qwerty zxcv'), null);
  assert.equal(engine.classifyLocalFallback(''), null);
});

test('draft builders produce complete documents', () => {
  const scamDraft = engine.buildLocal1930Draft('Pay now', 90, ['Urgency', 'UPI'], 'KYC Fraud');
  assert.match(scamDraft, /Category: KYC Fraud/);
  assert.match(scamDraft, /Risk Assessment: 90\/100/);
  assert.match(scamDraft, /Urgency; UPI/);
  const civicDraft = engine.buildLocalCivicDraft('Street light broken', 'TANGEDCO');
  assert.match(civicDraft, /TANGEDCO,/);
  assert.match(civicDraft, /Ward 12, Coimbatore/);
});
