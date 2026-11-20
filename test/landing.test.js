import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('index.html, demo.html, app.html, and sw.js use cache-busted v=323 / v5.6 assets and populate phone screens', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  const demoHtml = fs.readFileSync(path.join(ROOT, 'public', 'demo.html'), 'utf8');
  const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const swJs = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

  assert.match(html, /class="ps-status"/);
  assert.match(html, /class="ps ps-0 on"[\s\S]*SPEED-DIAL 9[\s\S]*Vani IVR Connected/);
  assert.match(html, /class="ps ps-1"[\s\S]*GEMINI ROUTER[\s\S]*99%[\s\S]*KAVACH SCAM X-RAY[\s\S]*URIMAI CIVIC ROUTE/);
  assert.match(html, /class="ps ps-2"[\s\S]*Father's Voice Note[\s\S]*5-Resident Signature Block[\s\S]*CM Helpline 1100[\s\S]*WhatsApp Proxy/);
  assert.match(html, /class="hud-safe-bar"/);
  assert.match(html, /styles\.css\?v=323/);
  assert.match(html, /palettes\.css\?v=323/);
  assert.match(html, /landing\.css\?v=323/);
  assert.match(html, /avatar\.js\?v=323/);
  assert.match(demoHtml, /styles\.css\?v=323/);
  assert.match(appHtml, /styles\.css\?v=323/);
  assert.match(appHtml, /avatar\.js\?v=323/);
  assert.match(swJs, /chatsafe-vercel-v5\.6/);
  assert.match(html, /landing\.js\?v=320/);
  assert.match(html, /morph\.js\?v=320/);
  assert.match(html, /app\.js\?v=324/);
  assert.match(appHtml, /app\.js\?v=324/);
  assert.match(html, /English \+ 22 Eighth Schedule/);
});

test('5 emotion faces render distinct mouths on index.html, app.html, and avatar.js; no Gemini 2.5 banners remain', () => {
  const avatar = fs.readFileSync(path.join(ROOT, 'public', 'avatar.js'), 'utf8');
  assert.match(avatar, /function drawMouth\(/);
  assert.doesNotMatch(avatar, /const bars = 7/);
  assert.match(avatar, /mood === 'safe'[\s\S]*quadraticCurveTo/);
  assert.match(avatar, /mood === 'civic'[\s\S]*quadraticCurveTo/);
  assert.match(avatar, /mood === 'suspicious'[\s\S]*bezierCurveTo/);
  assert.match(avatar, /mood === 'critical'[\s\S]*quadraticCurveTo/);
  assert.match(avatar, /angry: \{[^}]*smile: 0,/);
  assert.match(avatar, /furious: \{[^}]*smile: 0,/);

  for (const file of ['index.html', 'app.html']) {
    const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
    for (const mood of ['idle', 'safe', 'civic', 'suspicious', 'critical']) {
      assert.match(html, new RegExp(`data-mood="${mood}"`), `${file} missing ${mood}`);
    }
  }

  const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  assert.match(appHtml, /class="keypad-earpiece"/);
  assert.match(appHtml, /class="keypad-callbar"/);

  for (const file of ['app.html', 'app.js', 'index.html', 'i18n.js', 'videoExplainer.js', 'connect.html']) {
    const src = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
    assert.doesNotMatch(src, /Gemini 2\.5/, `${file} still mentions Gemini 2.5`);
  }
});

test('landing.css forces 9/19.5 smartphone proportions, non-blank steps, zeroed top nav gap, frosted-white pills, and responsive rules', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public', 'landing.css'), 'utf8');

  assert.match(css, /html,\s*body,\s*\.landing,\s*#morph\.bg,\s*\.skip\s*\{[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*0 !important;/);
  assert.match(css, /\.landing-top[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*8px !important;\s*padding-bottom:\s*8px !important;\s*min-height:\s*0 !important;/);
  assert.match(css, /\.landing-top\s+\.mainnav\s*\{[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*0 !important;/);
  assert.match(
    css,
    /\.phone-3d\s*\{[\s\S]*z-index:\s*4;[\s\S]*display:\s*flex;[\s\S]*width:\s*clamp\(275px,\s*23vw,\s*325px\) !important;\s*height:\s*auto !important;\s*aspect-ratio:\s*9\s*\/\s*19\.5 !important;\s*max-height:\s*64vh !important;\s*min-height:\s*440px !important;\s*transform:\s*none !important;/,
  );
  assert.doesNotMatch(css, /\.phone-3d[^}]*min-height:\s*(?:0|360|380)px/);
  assert.match(css, /\.phone-screen\s*\{[\s\S]*z-index:\s*6;[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*416px;/);
  assert.match(css, /\.ps\.on\s*\{[\s\S]*position:\s*relative;[\s\S]*z-index:\s*10;/);
  assert.match(css, /\.landing-top\s+\.mainnav\s*\{[\s\S]*display:\s*flex !important;[\s\S]*align-items:\s*center !important;[\s\S]*gap:\s*12px !important;/);
  assert.match(css, /\.landing-top\s+\.mainnav\s+a\s*\{[\s\S]*padding:\s*6px 8px !important;[\s\S]*white-space:\s*nowrap !important;[\s\S]*flex-shrink:\s*0 !important;/);
  assert.match(css, /@media\s*\(max-width:\s*1100px\)\s*\{\s*\.landing-top\s+\.mainnav\s*\{\s*gap:\s*8px !important;\s*\}/);
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

test('app.html & styles.css enforce single-line IVR keypad pills, user-select none, zeroed top nav gap, and 9/19.5 sticky phone', () => {
  const appHtml = fs.readFileSync(path.join(ROOT, 'public', 'app.html'), 'utf8');
  const stylesCss = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');

  assert.match(appHtml, /BUTTON PHONE · SINGLE-LINE IVR/);
  assert.match(appHtml, /Test Call 1: OTP Scam \(Kavach\)/);
  assert.match(appHtml, /Test Call 2: Water Pipe \(Urimai\)/);
  assert.doesNotMatch(appHtml, /\bSim [AB]\b|IVR SIM/);

  assert.match(stylesCss, /\[data-theme="dark"\]\s*\{\s*--bg:\s*#000000;/);
  assert.match(stylesCss, /html,\s*body,\s*\.skip,\s*\.bg\s*\{[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*0 !important;/);
  assert.match(stylesCss, /header\.top[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*8px !important;\s*padding-bottom:\s*8px !important;\s*min-height:\s*0 !important;/);
  assert.match(stylesCss, /\.mainnav,\s*\.top\s+\.mainnav\s*\{[\s\S]*display:\s*flex !important;\s*align-items:\s*center !important;\s*gap:\s*12px !important;[\s\S]*margin-top:\s*0 !important;\s*padding-top:\s*0 !important;/);
  assert.match(stylesCss, /\.mainnav\s+a\s*\{[\s\S]*padding:\s*6px 8px !important;[\s\S]*white-space:\s*nowrap !important;\s*flex-shrink:\s*0 !important;/);
  assert.match(stylesCss, /@media\s*\(max-width:\s*1100px\)\s*\{\s*\.mainnav\s*\{\s*gap:\s*8px !important;\s*\}/);
  assert.match(
    stylesCss,
    /\.demo-sticky-phone\s*\{[\s\S]*width:\s*clamp\(275px,\s*23vw,\s*325px\) !important;\s*height:\s*auto !important;\s*aspect-ratio:\s*9\s*\/\s*19\.5 !important;\s*max-height:\s*64vh !important;\s*min-height:\s*440px !important;\s*transform:\s*none !important;/,
  );
  assert.doesNotMatch(stylesCss, /\.demo-sticky-phone[^}]*min-height:\s*(?:0|360|380|550)px/);
  assert.match(stylesCss, /\.keypad-phone\s*\{[\s\S]*user-select:\s*none;/);
  assert.match(stylesCss, /\.keypad-key\s*\{[\s\S]*user-select:\s*none;/);
  assert.match(stylesCss, /\.keypad-scenarios\s+\.chip\s*\{[\s\S]*color:\s*#f8fafc;[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);[\s\S]*border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.25\);[\s\S]*white-space:\s*nowrap;[\s\S]*user-select:\s*none;/);
});

test('morph.js shifts particle sphere upward and caps particle opacity <= 0.35 behind copy', () => {
  const js = fs.readFileSync(path.join(ROOT, 'public', 'morph.js'), 'utf8');
  assert.match(js, /const oy = w > 900 \? h \* 0\.30 : h \* 0\.34;/);
  assert.match(js, /Math\.min\(0\.35,/);
});
