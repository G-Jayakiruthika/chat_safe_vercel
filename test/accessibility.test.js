import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HTML_FILES = [
  'app.html',
  'index.html',
  'proxy.html',
  'demo.html',
  'connect.html',
  'account.html',
  'privacy.html',
];

describe('Accessibility compliance', () => {
  test('Every HTML page has lang attribute, viewport meta, and charset', () => {
    for (const file of HTML_FILES) {
      const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      assert.match(html, /<html[^>]+lang="/, `${file}: missing lang attribute`);
      assert.match(html, /charset=["']?utf-8/i, `${file}: missing charset`);
      assert.match(html, /name=["']viewport["']/, `${file}: missing viewport meta`);
    }
  });

  test('All pages have a <title> element', () => {
    for (const file of HTML_FILES) {
      const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      assert.match(html, /<title>[^<]+<\/title>/, `${file}: missing or empty <title>`);
    }
  });

  test('Skip links exist on key pages for keyboard navigation', () => {
    for (const file of ['app.html', 'proxy.html']) {
      const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      assert.match(html, /class="skip"[^>]*>Skip to/, `${file}: missing skip link`);
    }
  });

  test('Focus-visible outline is defined in styles.css', () => {
    const css = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');
    assert.match(css, /:focus-visible/, 'styles.css: missing :focus-visible rule');
    assert.match(css, /outline/, 'styles.css: missing outline property');
  });

  test('All <img> tags have alt attributes in HTML files', () => {
    for (const file of HTML_FILES) {
      const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      const imgs = html.match(/<img\b[^>]*>/gi) || [];
      for (const img of imgs) {
        assert.match(img, /alt=/, `${file}: <img> missing alt: ${img.slice(0, 80)}`);
      }
    }
  });

  test('Interactive elements (buttons) are present and form controls have labels', () => {
    const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
    const buttons = appHtml.match(/<button\b[^>]*>/gi) || [];
    assert.ok(buttons.length > 5, 'Expected several interactive buttons');
    // Textarea and inputs should have associated labels or aria-label
    const inputs = appHtml.match(/<(?:input|textarea)\b[^>]*>/gi) || [];
    for (const input of inputs) {
      // Honeypot fields are intentionally hidden from assistive tech
      if (/class="hp-field"/.test(input)) continue;
      const hasLabel = /aria-label|aria-labelledby|id=|placeholder=/.test(input);
      assert.ok(hasLabel, `Input/textarea should be labelled: ${input.slice(0, 80)}`);
    }
  });

  test('ARIA labels or aria-labelledby exist on key interactive sections', () => {
    const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
    assert.match(appHtml, /aria-label/, 'Expected at least one aria-label in app.html');
  });
});
