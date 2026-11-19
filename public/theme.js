'use strict';

/**
 * theme.js — Pre-paint theme + SkillForge-inspired Display & Accessibility Suite.
 *
 * Settings (saved in localStorage under `chatsafe.settings`):
 *   mode      dark | light | auto
 *   palette   auto | mantis | mandarin | nautilus | jellyfish | lionfish | anemone | bluedragon | starfish
 *   style     immersive | minimal        (full 3D/animations vs calm flat mode)
 *   text      1 | 1.15 | 1.3 | 1.5       (font scale)
 *   contrast  normal | high              (stronger borders + crisp contrast)
 *   motion    full | reduced             (stops animations & moving backgrounds)
 *   spacing   normal | wide              (wider letter/line spacing)
 *   notes     on | off                   (hover tooltips on [data-tip])
 */
(() => {
  const DEFAULTS = {
    mode: 'dark',
    palette: 'auto',
    style: 'immersive',
    text: '1',
    contrast: 'normal',
    motion: 'full',
    spacing: 'normal',
    notes: 'on',
  };
  const PALETTES = [
    ['auto', 'Auto (per section)', 'linear-gradient(135deg,#ff3d9a,#19e3c1,#5b8cff)'],
    ['mantis', 'Mantis (Magenta & Teal)', 'linear-gradient(135deg,#ff3d9a,#19e3c1)'],
    ['mandarin', 'Mandarin (Royal & Gold)', 'linear-gradient(135deg,#5b8cff,#ff9442)'],
    ['bluedragon', 'Blue Dragon (Civic Blue)', 'linear-gradient(135deg,#4f8bff,#8fd3f4)'],
    ['nautilus', 'Nautilus (Coral & Navy)', 'linear-gradient(135deg,#ff8d79,#e8c39e)'],
    ['jellyfish', 'Jellyfish (Lavender)', 'linear-gradient(135deg,#bda4ff,#ffd2e5)'],
    ['lionfish', 'Lionfish (Alert Rust)', 'linear-gradient(135deg,#ff6f45,#e9507a)'],
    ['anemone', 'Anemone (Fuchsia)', 'linear-gradient(135deg,#ff4d9d,#ffa33d)'],
    ['starfish', 'Starfish (Terracotta)', 'linear-gradient(135deg,#f0a884,#4ecdc4)'],
  ];
  const KEY = 'chatsafe.settings';
  let S = { ...DEFAULTS };
  const listeners = [];

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      S = { ...DEFAULTS, ...saved };
      const legacyTheme = localStorage.getItem('chatsafe.theme');
      if (!saved.mode && (legacyTheme === 'light' || legacyTheme === 'dark')) S.mode = legacyTheme;
    } catch {
      S = { ...DEFAULTS };
    }
    try {
      if (new URLSearchParams(location.search).get('reset') === 'look') {
        S = { ...DEFAULTS };
        localStorage.removeItem(KEY);
      }
    } catch { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      localStorage.setItem('chatsafe.theme', isLight() ? 'light' : 'dark');
    } catch { /* ignore */ }
  }

  function isLight() {
    return S.mode === 'light' || (S.mode === 'auto' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
  }

  function visualsOff() {
    const why = [];
    if (S.contrast === 'high') why.push('High contrast');
    if (S.style === 'minimal') why.push('Minimal style');
    if (S.motion === 'reduced') why.push('Reduce motion');
    return why;
  }

  function apply() {
    const root = document.documentElement;
    const light = isLight();
    const theme = light ? 'light' : 'dark';
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (S.palette && S.palette !== 'auto') {
      root.dataset.palette = S.palette;
    } else if (!root.dataset.palette) {
      root.dataset.palette = document.body?.dataset?.defaultPalette || 'mantis';
    }
    root.style.setProperty('--scale', S.text || '1');

    if (document.body) {
      const b = document.body;
      b.classList.toggle('light', light);
      b.classList.toggle('minimal', S.style === 'minimal');
      b.classList.toggle('hc', S.contrast === 'high');
      b.classList.toggle('no-motion', S.motion === 'reduced');
      b.classList.toggle('wide-spacing', S.spacing === 'wide');
      b.classList.toggle('notes-off', S.notes === 'off');
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#eef4fb' : '#070b14');

    const gear = document.getElementById('btn-settings');
    const off = visualsOff();
    if (gear) {
      gear.classList.toggle('flagged', off.length > 0);
      gear.dataset.tip = off.length
        ? `${off.join(' + ')} is on — click to customize`
        : 'Colours, text size, minimalist style & accessibility';
    }
  }

  function set(key, value) {
    S[key] = value;
    save();
    apply();
    listeners.forEach((fn) => fn({ ...S, light: isLight() }));
  }

  function reset() {
    S = { ...DEFAULTS };
    save();
    apply();
    listeners.forEach((fn) => fn({ ...S, light: isLight() }));
  }

  // Apply before first paint to prevent theme flash
  load();
  apply();

  /* ---------------- Settings Panel & Tooltips ---------------- */
  const seg = (key, opts) =>
    `<div class="set-seg" role="radiogroup" data-key="${key}">` +
    opts.map(([v, label, tip]) => `<button type="button" role="radio" aria-checked="${S[key] === v}" class="${S[key] === v ? 'on' : ''}" data-v="${v}" data-tip="${tip || ''}">${label}</button>`).join('') +
    '</div>';

  function panelHtml() {
    const off = visualsOff();
    const warn = off.length
      ? `<div class="set-warn"><b>${off.join(' + ')} is active.</b> 3D effects are simplified.<button type="button" class="button secondary sm" id="set-restore">Restore full 3D look</button></div>`
      : '';
    const swatches = PALETTES.map(([id, name, bg]) =>
      `<button type="button" class="sw ${S.palette === id ? 'on' : ''}" data-v="${id}" style="background:${bg}" data-tip="${name}" aria-label="${name}"></button>`
    ).join('');
    return `
      <div class="set-head"><h3>Display &amp; Accessibility</h3><button type="button" class="icon-btn" id="set-close" aria-label="Close settings">✕</button></div>
      ${warn}
      <label class="lbl">Brightness</label>${seg('mode', [['dark', '🌙 Dark', 'Dark theme'], ['light', '☀️ Bright', 'Light theme'], ['auto', 'Auto', 'Match OS']])}
      <label class="lbl">Visual Style</label>${seg('style', [['immersive', '✨ Immersive', '3D morph, avatars & glow'], ['minimal', '▢ Minimalist', 'Calm, flat accessible layout']])}
      <label class="lbl">Colour Palette</label><div class="swatches" data-key="palette">${swatches}</div>
      <label class="lbl">Text Size</label>${seg('text', [['1', 'A', 'Normal'], ['1.15', 'A+', 'Large'], ['1.3', 'A++', 'Larger'], ['1.5', 'A+++', 'Extra large']])}
      <label class="lbl">Contrast</label>${seg('contrast', [['normal', 'Normal', ''], ['high', 'High Contrast', 'Sharper borders & high-contrast ink']])}
      <label class="lbl">Motion</label>${seg('motion', [['full', 'Animated', ''], ['reduced', 'Reduce Motion', 'Stops 3D motion']])}
      <label class="lbl">Reading Spacing</label>${seg('spacing', [['normal', 'Normal', ''], ['wide', 'Wide Spacing', 'Dyslexia-friendly letter & line spacing']])}
      <label class="lbl">Hover Notes</label>${seg('notes', [['on', 'Show notes', 'Tooltips on hover'], ['off', 'Hide notes', '']])}
      <div class="set-foot"><button type="button" class="button secondary sm" id="set-reset">Reset to defaults</button></div>
    `;
  }

  function openPanel() {
    let p = document.getElementById('settings-panel');
    if (!p) {
      p = document.createElement('aside');
      p.id = 'settings-panel';
      p.className = 'glass set-panel';
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-label', 'Display and accessibility settings');
      document.body.appendChild(p);
    }
    p.innerHTML = panelHtml();
    p.hidden = false;
    p.querySelector('#set-close').onclick = () => { p.hidden = true; };
    p.querySelector('#set-reset').onclick = () => { reset(); openPanel(); };
    const restore = p.querySelector('#set-restore');
    if (restore) {
      restore.onclick = () => {
        S.contrast = 'normal';
        S.style = 'immersive';
        S.motion = 'full';
        save();
        apply();
        listeners.forEach((fn) => fn({ ...S, light: isLight() }));
        openPanel();
      };
    }
    p.querySelectorAll('[data-key] [data-v]').forEach((b) => {
      b.onclick = () => {
        set(b.parentElement.dataset.key, b.dataset.v);
        openPanel();
      };
    });
  }

  let tipEl = null;
  let tipTimer = null;
  function showTip(target) {
    if (S.notes === 'off') return;
    const text = target.dataset.tip;
    if (!text) return;
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'sf-tip';
      tipEl.setAttribute('role', 'tooltip');
    }
    if (!tipEl.isConnected) document.body.appendChild(tipEl);
    tipEl.textContent = text;
    tipEl.classList.add('show');
    const r = target.getBoundingClientRect();
    const tw = tipEl.offsetWidth;
    const th = tipEl.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    const y = r.top - th - 10 < 8 ? r.bottom + 10 : r.top - th - 10;
    tipEl.style.left = `${x}px`;
    tipEl.style.top = `${y}px`;
  }
  const hideTip = () => { clearTimeout(tipTimer); tipEl?.classList.remove('show'); };

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-settings')) openPanel();
      else {
        const p = document.getElementById('settings-panel');
        if (p && !p.hidden && !e.target.closest('#settings-panel')) p.hidden = true;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const p = document.getElementById('settings-panel');
        if (p) p.hidden = true;
        hideTip();
      }
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest?.('[data-tip]');
      if (!t) return;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => showTip(t), 350);
    });
    document.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-tip]')) hideTip(); });
    document.addEventListener('scroll', hideTip, { passive: true, capture: true });
  });

  window.ChatSafeTheme = {
    settings: () => ({ ...S }),
    set,
    reset,
    apply,
    isLight,
    openPanel,
    isAutoPalette: () => S.palette === 'auto',
    onChange: (fn) => listeners.push(fn),
  };
})();
