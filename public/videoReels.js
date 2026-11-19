'use strict';

/**
 * videoReels.js — 3-Column Verified Scam Video News & Reels Grid + Verified User Video Publisher.
 * Renders crisp visual reel cards with:
 *   - Top-left category shield badge & top-right duration pill
 *   - Illustrated animated Canvas cover & interactive scene-by-scene playback (or real uploaded <video>)
 *   - Centered circular Play/Pause button + Voice Narration & Mute toggles
 *   - Title, 2-line summary, ✓ Verified Creator & views footer
 */
(() => {
  const STORAGE_KEY = 'chatsafe.userReels';

  function loadUserReels() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveUserReels(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
    } catch { /* ignore */ }
  }

  function wrapText(c, str, x, y, maxW, lh, maxLines = 4) {
    const words = String(str || '').split(/\s+/);
    let line = '';
    let yy = y;
    let lines = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > maxW && line) {
        c.fillText(line, x, yy);
        lines += 1;
        if (lines >= maxLines) return;
        line = w;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) c.fillText(line, x, yy);
  }

  function drawReelVisual(canvas, reel, progress, playing, now) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const t = now / 1000;
    const accent = reel.accent || '#7c3aed';

    // Cinematic dark studio backdrop with subtle glow
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#121324');
    bg.addColorStop(0.5, '#1b1736');
    bg.addColorStop(1, '#0c1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const radial = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, W * 0.68);
    radial.addColorStop(0, `${accent}55`);
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // Decorative geometric waveform / emblem in background
    ctx.strokeStyle = `${accent}44`;
    ctx.lineWidth = 2;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.36, 56 + ring * 26 + (playing ? Math.sin(t * 3 + ring) * 5 : 0), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center geometric vector emblem per category (no emoji glyphs)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.22);
    ctx.lineTo(W / 2 + 24, H * 0.27);
    ctx.lineTo(W / 2 + 20, H * 0.37);
    ctx.lineTo(W / 2, H * 0.43);
    ctx.lineTo(W / 2 - 20, H * 0.37);
    ctx.lineTo(W / 2 - 24, H * 0.27);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 8, H * 0.33);
    ctx.lineTo(W / 2 - 2, H * 0.38);
    ctx.lineTo(W / 2 + 10, H * 0.29);
    ctx.stroke();

    const scenes = reel.scenes || [{ badge: reel.category, headline: reel.title, body: reel.summary || '' }];
    const idx = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
    const sc = scenes[idx];

    // Story progress bars when playing
    if (playing) {
      const barW = (W - 36 - (scenes.length - 1) * 6) / scenes.length;
      for (let i = 0; i < scenes.length; i++) {
        const bx = 18 + i * (barW + 6);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(bx, 10, barW, 3.5);
        const f = i < idx ? 1 : i === idx ? (progress * scenes.length) % 1 : 0;
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(bx, 10, barW * f, 3.5);
      }
    }

    // Caption card inside frame
    ctx.fillStyle = 'rgba(9, 13, 26, 0.78)';
    ctx.strokeStyle = `${accent}99`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(18, H * 0.56, W - 36, H * 0.35, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(sc.badge || reel.category).toUpperCase(), 32, H * 0.63);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px system-ui, sans-serif';
    wrapText(ctx, sc.headline || reel.title, 32, H * 0.70, W - 64, 22, 2);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px system-ui, sans-serif';
    wrapText(ctx, sc.body || reel.summary || '', 32, H * 0.82, W - 64, 18, 2);
  }

  const ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l14 8-14 8V4z"/></svg>';
  const ICON_PAUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
  const ICON_SHIELD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  const activePauseHandlers = new Set();

  function stopAll() {
    for (const pauseFn of [...activePauseHandlers]) {
      try { pauseFn(); } catch { /* ignore */ }
    }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    window.ChatSafeSound?.stopAll?.();
  }

  function renderReelsFeed(container, baseReels, { onSpeak } = {}) {
    if (!container) return;
    stopAll();
    activePauseHandlers.clear();
    const all = [...loadUserReels(), ...baseReels];
    container.replaceChildren();

    if (!all.length) {
      container.innerHTML = '<p class="muted small">No video reels match this city filter yet. Try "All India" or post a verified alert video!</p>';
      return;
    }

    all.forEach((reel) => {
      const card = document.createElement('article');
      card.className = 'reel-card-grid glass';

      const media = document.createElement('div');
      media.className = 'reel-thumb-wrap';

      let playing = false;
      let progress = 0;
      let raf = null;
      let last = performance.now();

      if (reel.videoUrl) {
        const video = document.createElement('video');
        video.src = reel.videoUrl;
        video.loop = true;
        video.playsInline = true;
        video.className = 'reel-video';
        media.appendChild(video);

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'reel-play-orb';
        playBtn.setAttribute('aria-label', `Play or pause ${reel.title}`);
        playBtn.innerHTML = ICON_PLAY;

        const forcePause = () => {
          if (!video.paused) video.pause();
          video.muted = true;
          playBtn.innerHTML = ICON_PLAY;
          playBtn.classList.remove('playing');
          playBtn.setAttribute('aria-pressed', 'false');
        };
        activePauseHandlers.add(forcePause);

        playBtn.addEventListener('click', () => {
          if (video.paused) {
            stopAll();
            video.muted = false;
            video.play().catch(() => {});
            playBtn.innerHTML = ICON_PAUSE;
            playBtn.classList.add('playing');
            playBtn.setAttribute('aria-pressed', 'true');
          } else {
            forcePause();
            stopAll();
          }
        });
        media.appendChild(playBtn);
      } else {
        const cv = document.createElement('canvas');
        cv.width = 360;
        cv.height = 400;
        cv.className = 'reel-canvas';
        cv.setAttribute('role', 'img');
        cv.setAttribute('aria-label', `${reel.title} — ${reel.category} video reel`);
        media.appendChild(cv);

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'reel-play-orb';
        playBtn.setAttribute('aria-label', `Play or pause ${reel.title}`);
        playBtn.innerHTML = ICON_PLAY;

        const step = (now) => {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (playing) {
            progress = (progress + dt / (reel.durationSec || 16)) % 1;
            drawReelVisual(cv, reel, progress, true, now);
            raf = requestAnimationFrame(step);
          }
        };

        const forcePause = () => {
          playing = false;
          cancelAnimationFrame(raf);
          playBtn.innerHTML = ICON_PLAY;
          playBtn.classList.remove('playing');
          playBtn.setAttribute('aria-pressed', 'false');
          drawReelVisual(cv, reel, progress, false, performance.now());
        };
        activePauseHandlers.add(forcePause);

        playBtn.addEventListener('click', () => {
          const next = !playing;
          stopAll();
          if (next) {
            playing = true;
            playBtn.innerHTML = ICON_PAUSE;
            playBtn.classList.add('playing');
            playBtn.setAttribute('aria-pressed', 'true');
            last = performance.now();
            raf = requestAnimationFrame(step);
            if (onSpeak) {
              const script = (reel.scenes || []).map((s) => `${s.headline}. ${s.body}`).join(' ');
              onSpeak(script || reel.summary || reel.title);
            }
          }
        });

        drawReelVisual(cv, reel, 0, false, performance.now());
        media.appendChild(playBtn);
      }

      // Top-left category shield pill + Top-right duration pill
      const catBadge = document.createElement('span');
      catBadge.className = 'reel-badge-cat';
      catBadge.innerHTML = `${ICON_SHIELD} <span>${escapeHtml(reel.category)}</span>`;
      const durBadge = document.createElement('span');
      durBadge.className = 'reel-badge-dur';
      durBadge.textContent = reel.duration || '0:45';
      media.append(catBadge, durBadge);

      const body = document.createElement('div');
      body.className = 'reel-card-body';
      body.innerHTML = `
        <h4>${escapeHtml(reel.title)}</h4>
        <p class="small muted">${escapeHtml(reel.summary || '')}</p>
        <div class="reel-card-foot">
          <span class="reel-verified">${ICON_CHECK} ${escapeHtml(reel.creator)}</span>
          <span class="small muted">${escapeHtml(reel.views || 'New')}</span>
        </div>
      `;

      card.append(media, body);
      container.appendChild(card);
    });
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  window.addEventListener('pagehide', stopAll);

  function addUserReel(reel) {
    const list = loadUserReels();
    list.unshift(reel);
    saveUserReels(list);
    return list;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.ChatSafeReels = { renderReelsFeed, addUserReel, loadUserReels, stopAll };
})();
