import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('Security headers and configuration', () => {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const globalHeaders = vercelConfig.headers.find((h) => h.source === '/(.*)');
  const headerMap = Object.fromEntries(globalHeaders.headers.map((h) => [h.key.toLowerCase(), h.value]));

  test('Content-Security-Policy blocks unsafe-inline scripts and restricts connect-src', () => {
    const csp = headerMap['content-security-policy'];
    assert.ok(csp, 'CSP header must exist');
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /upgrade-insecure-requests/);
  });

  test('HSTS is set with long max-age, includeSubDomains, and preload', () => {
    const hsts = headerMap['strict-transport-security'];
    assert.ok(hsts, 'HSTS header must exist');
    assert.match(hsts, /max-age=\d{7,}/);
    assert.match(hsts, /includeSubDomains/);
    assert.match(hsts, /preload/);
  });

  test('X-Content-Type-Options nosniff, X-Frame-Options DENY, and COOP same-origin are set', () => {
    assert.equal(headerMap['x-content-type-options'], 'nosniff');
    assert.equal(headerMap['x-frame-options'], 'DENY');
    assert.equal(headerMap['cross-origin-opener-policy'], 'same-origin');
    assert.match(headerMap['referrer-policy'], /no-referrer/);
  });

  test('API routes have Cache-Control: no-store', () => {
    const apiHeaders = vercelConfig.headers.find((h) => h.source === '/api/(.*)');
    assert.ok(apiHeaders, 'API header block must exist');
    const cc = apiHeaders.headers.find((h) => h.key === 'Cache-Control');
    assert.equal(cc.value, 'no-store');
  });

  test('Gemini API key is never sent in URLs — only as x-goog-api-key header', () => {
    const gemini = fs.readFileSync(path.join(ROOT, 'api', 'gemini.js'), 'utf8');
    assert.doesNotMatch(gemini, /\?key=/);
    assert.doesNotMatch(gemini, /&key=/);
    assert.match(gemini, /x-goog-api-key/);
  });

  test('HTML meta CSP uses script-src self without unsafe-inline', () => {
    const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
    const metaCsp = appHtml.match(/content="[^"]*script-src[^"]*"/i)?.[0] || '';
    assert.match(metaCsp, /script-src 'self'/);
    assert.doesNotMatch(metaCsp, /script-src[^"]*'unsafe-inline'/);
  });
});
