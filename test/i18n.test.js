import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('Internationalization (i18n) support', () => {
  test('i18n.js defines at least 20 languages with required fields', () => {
    const code = fs.readFileSync(path.join(ROOT, 'public', 'i18n.js'), 'utf8');
    assert.match(code, /CHATSAFE_I18N|languages/, 'Must define i18n data');

    // Count language blocks (two-letter keys at the top object level)
    const langBlocks = code.match(/^\s{2}[a-z]{2}:\s*\{/gm) || [];
    assert.ok(langBlocks.length >= 10, `Expected 10+ languages, found ${langBlocks.length}`);
  });

  test('app.js uses the translation function for user-facing strings', () => {
    const code = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
    assert.match(code, /\bt\(/, 'app.js must use t() translation function');
    assert.match(code, /I18N|CHATSAFE_I18N/, 'app.js must reference i18n data');
  });

  test('HTML pages specify lang="en" as the base language', () => {
    for (const file of ['app.html', 'index.html']) {
      const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      assert.match(html, /lang="en"/, `${file}: must set lang="en"`);
    }
  });
});
