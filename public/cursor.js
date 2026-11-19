'use strict';

/**
 * cursor.js — 5 selectable cursor styles (from SkillForge AI) + Chat_Safe danger/civic states
 * + scroll reveal + magnetic buttons.
 *   orb    : dot + lagging ring (turns red on scam cards, blue on civic cards)
 *   comet  : glowing particle trail behind pointer
 *   neon   : smooth neon ribbon following pointer
 *   spark  : bursts of sparks on click or fast movement
 *   system : native OS cursor
 */
(() => {
  const fine = window.matchMedia('(pointer: fine)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'system';
  try {
    mode = localStorage.getItem('chatsafe.cursor') || 'system';
  } catch { /* ignore */ }
  if (!fine || still) mode = 'system';

  const REVEAL = 'section, .card, .type-card, .lang-chip, .step, .ch-card, .faq-item, .agent-card, .reel-card';
  function revealOnScroll() {
    const nodes = [...document.querySelectorAll(REVEAL)].filter((n) => !n.closest('.no-reveal'));
    if (still || document.body.classList.contains('no-motion')) {
      nodes.forEach((n) => n.classList.add('seen'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('seen');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px' },
    );
    nodes.forEach((n, i) => {
      n.classList.add('reveal');
      n.style.setProperty('--d', `${Math.min(i % 8, 7) * 55}ms`);
      io.observe(n);
    });
  }

  function magnets() {
    for (const b of document.querySelectorAll('.btn, .button.primary, .type-card, .ch-card, .agent-card')) {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        b.style.setProperty('--mx', `${x * 8}px`);
        b.style.setProperty('--my', `${y * 6}px`);
      });
      b.addEventListener('pointerleave', () => {
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    }
  }

  let ring, dot, cv, ctx;
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;
  let px = tx;
  let py = ty;
  let shown = false;
  let parts = [];
  let trail = [];

  function burst(bx, by, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4;
      parts.push({ x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: 1.5 + Math.random() * 2.2, h: Math.random() < 0.5 ? 186 : 326 });
    }
  }

  function applyMode() {
    if (!ring || !dot || !cv) return;
    const minimal = document.body.classList.contains('minimal') || document.body.classList.contains('no-motion');
    const activeMode = !fine || minimal ? 'system' : mode;
    const custom = activeMode !== 'system';
    document.documentElement.classList.toggle('has-cursor', custom);
    ring.style.display = activeMode === 'orb' ? '' : 'none';
    dot.style.display = custom ? '' : 'none';
    cv.style.display = (activeMode === 'comet' || activeMode === 'neon' || activeMode === 'spark') ? '' : 'none';
    parts = [];
    trail = [];
    document.querySelectorAll('#cursor-menu button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  }

  function initCursor() {
    ring = document.createElement('div');
    ring.className = 'cur-ring';
    ring.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/></svg>';
    dot = document.createElement('div');
    dot.className = 'cur-dot';
    cv = document.createElement('canvas');
    cv.id = 'cursor-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv, ring, dot);
    ctx = cv.getContext('2d');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();
    applyMode();

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        rx = tx;
        ry = ty;
        ring.classList.add('on');
        dot.classList.add('on');
      }
      const sp = Math.hypot(tx - px, ty - py);
      if (mode === 'comet') {
        for (let i = 0; i < Math.min(4, 1 + sp / 8); i++) {
          parts.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, life: 1, r: 2 + Math.random() * 3, h: 180 + Math.random() * 140 });
        }
      } else if (mode === 'spark' && sp > 20) {
        burst(tx, ty, 4);
      }
      px = tx;
      py = ty;
      const hit = e.target instanceof Element ? e.target.closest('a, button, input, select, textarea, [role="button"], .type-card, .card, .agent-card') : null;
      ring.classList.toggle('hot', Boolean(hit));
      ring.classList.toggle('danger', Boolean(hit && hit.closest('[data-tone="scam"], .type-card, .verdict-scam')));
      ring.classList.toggle('civic-hover', Boolean(hit && hit.closest('[data-tone="civic"], .urimai-card')));
    }, { passive: true });

    window.addEventListener('pointerdown', () => {
      ring.classList.add('press');
      if (mode === 'spark' || mode === 'comet') burst(tx, ty, 16);
    });
    window.addEventListener('pointerup', () => ring.classList.remove('press'));
    document.addEventListener('pointerleave', () => {
      ring.classList.remove('on');
      dot.classList.remove('on');
      shown = false;
    });

    // Cursor picker menu wiring
    const btnCursor = document.getElementById('btn-cursor');
    const menuCursor = document.getElementById('cursor-menu');
    if (btnCursor && menuCursor) {
      btnCursor.addEventListener('click', (e) => {
        e.stopPropagation();
        menuCursor.hidden = !menuCursor.hidden;
      });
      menuCursor.querySelectorAll('button[data-mode]').forEach((b) => {
        b.addEventListener('click', () => {
          mode = b.dataset.mode;
          try { localStorage.setItem('chatsafe.cursor', mode); } catch { /* ignore */ }
          applyMode();
          menuCursor.hidden = true;
        });
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.cursor-picker')) menuCursor.hidden = true;
      });
    }

    window.ChatSafeTheme?.onChange?.(applyMode);

    const frame = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = `translate3d(${rx - 22}px, ${ry - 22}px, 0)`;
      dot.style.transform = `translate3d(${tx - 3}px, ${ty - 3}px, 0)`;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (mode === 'neon' && shown) {
        trail.push({ x: tx, y: ty });
        if (trail.length > 26) trail.shift();
        if (trail.length > 2) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length - 1; i++) {
              const mx = (trail[i].x + trail[i + 1].x) / 2;
              const my = (trail[i].y + trail[i + 1].y) / 2;
              ctx.quadraticCurveTo(trail[i].x, trail[i].y, mx, my);
            }
            const g = ctx.createLinearGradient(trail[0].x, trail[0].y, tx, ty);
            g.addColorStop(0, 'rgba(255,61,154,0)');
            g.addColorStop(1, pass ? '#ffffff' : '#22d3ee');
            ctx.strokeStyle = g;
            ctx.lineWidth = pass ? 2 : 7;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = pass ? 0 : 16;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      }
      if (parts.length) {
        for (const p of parts) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= mode === 'comet' ? 0.032 : 0.025;
        }
        parts = parts.filter((p) => p.life > 0);
        for (const p of parts) {
          ctx.fillStyle = `hsla(${p.h},100%,65%,${p.life})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  const start = () => {
    revealOnScroll();
    if (fine && !still) {
      initCursor();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
