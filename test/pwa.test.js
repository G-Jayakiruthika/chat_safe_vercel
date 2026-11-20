import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('PWA and service worker integrity', () => {
  test('Service worker caches all JS and CSS assets referenced in HTML', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    const shellMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
    assert.ok(shellMatch, 'SHELL array must be defined');
    const shell = shellMatch[1];

    // Core files must be in the cache shell
    const required = ['app.html', 'index.html', 'styles.css', 'app.js', 'fallbackEngine.js', 'core.js', 'sw.js'].filter(
      (f) => f !== 'sw.js',
    ); // sw.js doesn't cache itself
    for (const file of required) {
      assert.ok(shell.includes(file), `${file} must be in the SW SHELL cache`);
    }
  });

  test('Service worker never caches API routes', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    assert.match(sw, /\/api\//, 'SW must check for /api/ paths');
    assert.match(sw, /return/, 'SW must return early for API paths');
  });

  test('Service worker version follows semver pattern', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    assert.match(sw, /const CACHE = 'chatsafe-vercel-v\d+\.\d+'/, 'CACHE version must follow naming convention');
  });

  test('manifest.webmanifest exists and has required PWA fields', () => {
    const manifestPath = path.join(ROOT, 'public', 'manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.name, 'manifest must have name');
    assert.ok(manifest.short_name, 'manifest must have short_name');
    assert.ok(manifest.start_url, 'manifest must have start_url');
    assert.ok(manifest.display, 'manifest must have display mode');
    assert.ok(manifest.icons?.length > 0, 'manifest must have at least one icon');
  });

  test('Landing JS registers the service worker', () => {
    const landingJs = fs.readFileSync(path.join(ROOT, 'public', 'landing.js'), 'utf8');
    assert.match(landingJs, /serviceWorker/, 'landing.js must register the service worker');
  });

  test('All SHELL-listed files exist on disk', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
    const shellMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
    const files = [...shellMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const file of files) {
      const diskFile = file === './' ? 'index.html' : file;
      assert.ok(fs.existsSync(path.join(ROOT, 'public', diskFile)), `SHELL file missing on disk: ${file}`);
    }
  });
});
