import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('index.html populates all 3 interactive phone screens, safe-zone HUD, and ?v=320 assets', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');

  assert.match(html, /class="ps-status"/);
  assert.match(html, /class="ps ps-0 on"[\s\S]*SPEED-DIAL 9[\s\S]*Vani IVR Connected/);
  assert.match(html, /class="ps ps-1"[\s\S]*GEMINI ROUTER[\s\S]*99%[\s\S]*KAVACH SCAM X-RAY[\s\S]*URIMAI CIVIC ROUTE/);
  assert.match(html, /class="ps ps-2"[\s\S]*Father's Voice Note[\s\S]*5-Resident Signature Block[\s\S]*CM Helpline 1100[\s\S]*WhatsApp Proxy/);
  assert.match(html, /class="hud-safe-bar"/);
  assert.match(html, /landing\.css\?v=320/);
  assert.match(html, /landing\.js\?v=320/);
  assert.match(html, /morph\.js\?v=320/);
  assert.match(html, /English \+ 22 Eighth Schedule/);
});

test('landing.css defines flex phone screen layering, high-contrast frosted-white floating pills, and responsive rules', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public', 'landing.css'), 'utf8');

  assert.match(css, /\.phone-3d\s*\{[\s\S]*z-index:\s*4;[\s\S]*display:\s*flex;[\s\S]*max-height:\s*62vh;/);
  assert.match(css, /\.phone-screen\s*\{[\s\S]*z-index:\s*6;[\s\S]*flex:\s*1;/);
  assert.match(css, /\.ps\.on\s*\{[\s\S]*z-index:\s*10;/);
  assert.match(css, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\)/);
  assert.match(css, /backdrop-filter:\s*blur\(12px\)/);
  assert.match(css, /1px solid rgba\(15,\s*23,\s*42,\s*0\.14\)/);
  assert.match(css, /color:\s*#0f172a/);
  assert.match(css, /color:\s*#475569/);
  assert.match(css, /opacity:\s*1;[\s\S]*white-space:\s*nowrap;/);
  assert.match(css, /#morph\.bg\s*\{\s*z-index:\s*1;\s*\}/);
  assert.match(css, /\.demo-copy\s*\{[\s\S]*z-index:\s*10;/);
  assert.match(css, /@media\s*\(min-width:\s*1180px\)/);
  assert.match(css, /@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*899px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('morph.js shifts particle sphere upward and caps particle opacity <= 0.35 behind copy', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'morph.js'), 'utf8');
  assert.match(js, /const oy = w > 900 \? h \* 0\.30 : h \* 0\.34;/);
  assert.match(js, /Math\.min\(0\.35,/);
});
