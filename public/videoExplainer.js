'use strict';

/**
 * videoExplainer.js — 60-second interactive Canvas "video" player (SkillForge-style)
 * with chapters, captions, seekable timeline, fullscreen, and .webm video export.
 * Story: Rural father speed-dials '9' -> Gemini Intent Classification (Kavach vs Urimai)
 * -> Son's Family Hub Action Kit -> Photo + 5-Signature PDF OR CM Portal / Local Proxy.
 */
(() => {
  const W = 1280;
  const H = 720;
  const DUR = 60;
  const C = {
    bg: '#070b14',
    ink: '#eef4ff',
    muted: '#94a3b8',
    cyan: '#22d3ee',
    blue: '#3b82f6',
    pink: '#ff3d9a',
    amber: '#fbbf24',
    lime: '#34d399',
    red: '#f87171',
    line: 'rgba(148,163,184,.2)',
  };

  const AGENTS = ['Vani IVR (9)', 'Gemini Router', 'Kavach', 'Urimai', 'Setu O2O', 'Pay-Guard', 'Netra PII', 'Drishti'];
  const CHAPTERS = [
    { t: 0, name: "Speed-Dial '9'", cap: "Rural father presses '9' on his keypad phone. Vani answers in Tamil: 'Vanakkam. Tell me what happened.'" },
    { t: 8, name: 'Gemini Intent', cap: 'Gemini classifies speech in <1s: Scenario A = Bank OTP Scam (Kavach) vs Scenario B = Broken Water Pipe (Urimai).' },
    { t: 18, name: 'Urimai Handoff', cap: "AI tells Appa: 'I drafted an official complaint to the Municipal Water Board and sent it to your son.'" },
    { t: 28, name: 'Family Hub Kit', cap: "Son gets a live alert with Appa's voice recording, bilingual English + Tamil petition, and Photo Prompt." },
    { t: 38, name: 'Photo + 5 Signs', cap: 'Son uploads a photo of the broken pipe. Urimai embeds it into a PDF with a 5-resident signature table.' },
    { t: 48, name: 'Remote Bypass', cap: 'In another city? Switch to Digital-First CM Helpline (Mudhalvarin Mugavari) or send a Local Proxy WhatsApp link!' },
  ];

  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3));
  const seg = (t, a, b) => ease((t - a) / (b - a));
  const lerp = (a, b, p) => a + (b - a) * p;

  function createVideoExplainer({ canvas, caption, fill, timeEl, playBtn, bigBtn, track, chaptersEl, recBtn, fsBtn, player }) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;
    let playing = false;
    let last = 0;
    let recorder = null;

    if (chaptersEl) {
      chaptersEl.innerHTML = CHAPTERS.slice(1)
        .map((c) => `<span style="left:${(c.t / DUR) * 100}%" title="${c.name}"></span>`)
        .join('');
    }

    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const text = (s, x, y, size = 20, color = C.ink, weight = 600, align = 'left', mono = false) => {
      ctx.font = `${weight} ${size}px ${mono ? 'ui-monospace, Consolas, monospace' : 'system-ui, sans-serif'}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(s, x, y);
    };

    function chapterIndexAt(time) {
      for (let i = CHAPTERS.length - 1; i >= 0; i--) {
        if (time >= CHAPTERS[i].t) return i;
      }
      return 0;
    }

    function drawBus(time) {
      const idx = chapterIndexAt(time);
      const active = [[0, 2], [0, 1, 2, 3], [1, 3, 4], [3, 4, 6], [3, 4, 5], [3, 4, 7]][Math.max(0, idx)];
      const y = 48;
      const x0 = 150;
      const step = (W - 220) / (AGENTS.length - 1);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + step * (AGENTS.length - 1), y);
      ctx.stroke();

      const ph = (time * 0.85) % 1;
      const px = lerp(x0 + step * active[0], x0 + step * active[active.length - 1], ph);
      ctx.shadowColor = C.pink;
      ctx.shadowBlur = 16;
      ctx.fillStyle = C.pink;
      ctx.beginPath();
      ctx.arc(px, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      AGENTS.forEach((a, i) => {
        const on = active.includes(i);
        const cx = x0 + step * i;
        ctx.fillStyle = on ? C.cyan : '#162036';
        if (on) { ctx.shadowColor = C.cyan; ctx.shadowBlur = 18; }
        ctx.beginPath();
        ctx.arc(cx, y, on ? 10 : 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        text(a, cx, y + 26, 12, on ? C.ink : C.muted, on ? 700 : 500, 'center');
      });
      text('AGENT BUS', 28, y + 4, 12, C.muted, 700, 'left', true);
    }

    function draw(time) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const g1 = ctx.createRadialGradient(W * 0.8, H * 0.25, 20, W * 0.8, H * 0.25, 520);
      g1.addColorStop(0, 'rgba(34,211,238,0.18)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.2, H * 0.85, 20, W * 0.2, H * 0.85, 480);
      g2.addColorStop(0, 'rgba(59,130,246,0.2)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      drawBus(time);

      const chIdx = chapterIndexAt(time);
      const ch = CHAPTERS[chIdx];
      text(`0${chIdx + 1} / 0${CHAPTERS.length}  ·  ${ch.name.toUpperCase()}`, 60, 134, 14, C.cyan, 700, 'left', true);

      if (time < 8) {
        // Keep keypad phone immediately visible at t=0 so thumbnail is vivid; animate wave & bubbles
        const p = Math.max(0.95, seg(time, 0, 0.8));
        ctx.globalAlpha = p;
        // Keypad phone visual
        rr(140, 190, 260, 440, 32);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = C.cyan;
        ctx.lineWidth = 2;
        ctx.stroke();
        rr(165, 220, 210, 140, 14);
        ctx.fillStyle = '#06202c';
        ctx.fill();
        text('SPEED DIAL 9', 270, 260, 15, C.cyan, 700, 'center', true);
        text(playing ? '📞 Calling Vani AI…' : '📞 Press Play to Watch', 270, 305, 16, C.ink, 600, 'center');
        // Keypad grid
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        keys.forEach((k, idx) => {
          const kx = 175 + (idx % 3) * 68;
          const ky = 390 + Math.floor(idx / 3) * 62;
          rr(kx, ky, 54, 46, 10);
          const pulse9 = k === '9' && playing ? `rgba(34,211,238,${0.75 + 0.25 * Math.sin(time * 8)})` : (k === '9' ? C.cyan : '#1e293b');
          ctx.fillStyle = pulse9;
          ctx.fill();
          text(k, kx + 27, ky + 30, 20, k === '9' ? '#04111d' : C.ink, 800, 'center');
        });

        // Speech bubbles visible right away as preview, animating smoothly during playback
        const q = time === 0 ? 0.92 : seg(time, 0.4, 2.2);
        if (q > 0) {
          ctx.globalAlpha = q;
          rr(480, 240, 660, 130, 22);
          ctx.fillStyle = 'rgba(34,211,238,0.12)';
          ctx.fill();
          ctx.strokeStyle = C.cyan;
          ctx.stroke();
          text('VANI VOICE AGENT (TAMIL / HINDI / 23 LANGS)', 515, 275, 13, C.cyan, 700, 'left', true);
          text('"Vanakkam. Tell me what happened."', 515, 325, 28, C.ink, 700);
        }
        const r = time === 0 ? 0.78 : seg(time, 2.2, 4.0);
        if (r > 0) {
          ctx.globalAlpha = r;
          rr(480, 410, 660, 140, 22);
          ctx.fillStyle = 'rgba(59,130,246,0.15)';
          ctx.fill();
          ctx.strokeStyle = C.blue;
          ctx.stroke();
          text('APPA SPEAKS', 515, 445, 13, C.amber, 700, 'left', true);
          text('"The panchayat water pipe on my street broke', 515, 490, 23, C.ink, 600);
          text('3 days ago and no one is fixing it."', 515, 524, 23, C.ink, 600);
        }
        ctx.globalAlpha = 1;
      } else if (time < 18) {
        const lt = time - 8;
        const p = seg(lt, 0, 1.5);
        ctx.globalAlpha = p;
        text('Gemini 2.5 Flash — Real-Time Intent Routing', 640, 200, 32, C.ink, 800, 'center');
        // Scenario A (Red)
        rr(100, 250, 480, 320, 24);
        ctx.fillStyle = 'rgba(248,113,113,0.12)';
        ctx.fill();
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 2;
        ctx.stroke();
        text('SCENARIO A · KAVACH SHIELD', 135, 295, 14, C.red, 700, 'left', true);
        text('"A man asked for my bank OTP"', 135, 345, 24, C.ink, 700);
        text('-> Triggers Red Alert + Eyes Furious', 135, 405, 18, C.muted, 500);
        text('-> 1930 Cybercrime Draft + Family SOS', 135, 442, 18, C.muted, 500);

        // Scenario B (Blue - Highlighted)
        const pulse = 0.5 + 0.5 * Math.sin(lt * 6);
        rr(700, 250, 480, 320, 24);
        ctx.fillStyle = 'rgba(59,130,246,0.22)';
        ctx.fill();
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 2 + pulse * 2;
        ctx.stroke();
        text('SCENARIO B · URIMAI ENGINE ✓', 735, 295, 14, C.cyan, 700, 'left', true);
        text('"Water pipe broke 3 days ago"', 735, 345, 24, C.ink, 700);
        text('-> Intent: CIVIC GRIEVANCE', 735, 405, 18, C.lime, 700);
        text('-> Dept: Municipal Water Board', 735, 442, 18, C.ink, 500);
        text('-> Dispatches Urimai Action Kit', 735, 479, 18, C.cyan, 600);
        ctx.globalAlpha = 1;
      } else if (time < 28) {
        const lt = time - 18;
        const p = seg(lt, 0, 1.4);
        ctx.globalAlpha = p;
        rr(180, 220, 920, 340, 28);
        ctx.fillStyle = 'rgba(15,23,42,0.92)';
        ctx.fill();
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 2;
        ctx.stroke();
        text('STEP 3 · VOICE HANDOFF TO FAMILY DASHBOARD', 230, 270, 14, C.cyan, 700, 'left', true);
        text('Kavach replies to Appa in Tamil & English:', 230, 325, 22, C.muted, 600);
        text('"I understand the water pipe is broken.', 230, 385, 30, C.ink, 700);
        text('I have drafted an official complaint to the Municipal', 230, 428, 30, C.ink, 700);
        text('Water Board and sent it to your son\'s phone."', 230, 471, 30, C.cyan, 700);
        ctx.globalAlpha = 1;
      } else if (time < 38) {
        const lt = time - 28;
        const p = seg(lt, 0, 1.4);
        ctx.globalAlpha = p;
        rr(220, 190, 840, 410, 26);
        ctx.fillStyle = 'rgba(30,41,59,0.94)';
        ctx.fill();
        ctx.strokeStyle = C.cyan;
        ctx.stroke();
        text('🚨 FAMILY REQUEST: URIMAI DRAFT READY', 265, 245, 16, C.amber, 800, 'left', true);
        text('Audio: [ ▶ Play recording of father\'s voice ]', 265, 300, 20, C.lime, 600);
        rr(265, 330, 750, 135, 16);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        text('Official English + தமிழ் Petition — Municipal Water Board', 290, 370, 20, C.ink, 700);
        text('"To the Executive Officer, Ward 12 water main broken for 3 days..."', 290, 410, 17, C.muted, 500);
        rr(265, 495, 230, 56, 14);
        ctx.fillStyle = C.blue;
        ctx.fill();
        text('📷 Upload Photo', 380, 530, 18, '#fff', 700, 'center');
        rr(525, 495, 230, 56, 14);
        ctx.fillStyle = C.lime;
        ctx.fill();
        text('📄 Download PDF', 640, 530, 18, '#04111d', 700, 'center');
        rr(785, 495, 230, 56, 14);
        ctx.fillStyle = C.cyan;
        ctx.fill();
        text('💬 Share WhatsApp', 900, 530, 18, '#04111d', 700, 'center');
        ctx.globalAlpha = 1;
      } else if (time < 48) {
        const lt = time - 38;
        const p = seg(lt, 0, 1.2);
        ctx.globalAlpha = p;
        rr(320, 170, 640, 460, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        text('URIMAI OFFICIAL PETITION (A4 PDF)', 360, 215, 16, '#0f172a', 800, 'left', true);
        text('To: Municipal Water Board, Ward 12', 360, 250, 17, '#334155', 600);
        rr(360, 275, 260, 150, 12);
        ctx.fillStyle = '#bae6fd';
        ctx.fill();
        text('📷 Embedded Street Photo', 490, 355, 16, '#0369a1', 700, 'center');
        rr(360, 450, 560, 130, 8);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        text('Signatures of Affected Residents (Min 5 required)', 375, 478, 15, '#0f172a', 700);
        text('1. _____________   2. _____________   3. _____________', 375, 520, 14, '#475569', 500);
        text('4. _____________   5. _____________', 375, 555, 14, '#475569', 500);
        ctx.globalAlpha = 1;
      } else {
        const lt = time - 48;
        const p = seg(lt, 0, 1.2);
        ctx.globalAlpha = p;
        text('Family Away from Home? Two Adaptive Pathways:', 640, 200, 30, C.ink, 800, 'center');
        rr(110, 250, 500, 320, 22);
        ctx.fillStyle = 'rgba(59,130,246,0.16)';
        ctx.fill();
        ctx.strokeStyle = C.blue;
        ctx.stroke();
        text('SOLUTION 1 · DIGITAL-FIRST BYPASS', 145, 295, 14, C.cyan, 700, 'left', true);
        text('CM Helpline & CPGRAMS', 145, 345, 26, C.ink, 800);
        text('1-click copy formatted text for', 145, 395, 18, C.muted, 500);
        text("TN Mudhalvarin Mugavari / Namma Chennai.", 145, 425, 18, C.muted, 500);
        text('Submit digitally from anywhere in 30s!', 145, 475, 18, C.lime, 700);

        rr(670, 250, 500, 320, 22);
        ctx.fillStyle = 'rgba(52,211,153,0.14)';
        ctx.fill();
        ctx.strokeStyle = C.lime;
        ctx.stroke();
        text('SOLUTION 2 · LOCAL PROXY HANDOFF', 705, 295, 14, C.lime, 700, 'left', true);
        text('WhatsApp Neighbor / CSC Link', 705, 345, 26, C.ink, 800);
        text('Forward secure link to neighbor or', 705, 395, 18, C.muted, 500);
        text('auto driver. They snap photo & print.', 705, 425, 18, C.muted, 500);
        text('Zero barriers for rural elders.', 705, 475, 18, C.cyan, 700);
        ctx.globalAlpha = 1;
      }

      if (caption) caption.textContent = ch.cap;
      if (fill) fill.style.width = `${(time / DUR) * 100}%`;
      if (timeEl) {
        const s = Math.floor(time);
        timeEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} / 1:00`;
      }
    }

    let rafId = null;

    const ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l14 8-14 8V4z"/></svg>';
    const ICON_PAUSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    const ICON_DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>';
    const ICON_STOP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14v14H5z"/></svg>';

    function setPlaying(v) {
      playing = Boolean(v);
      if (playBtn) {
        playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        playBtn.setAttribute('aria-pressed', String(playing));
        playBtn.setAttribute('aria-label', playing ? 'Pause demo video' : 'Play demo video');
      }
      if (bigBtn) {
        bigBtn.hidden = playing;
        bigBtn.style.display = playing ? 'none' : 'inline-flex';
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (playing) {
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      } else {
        window.ChatSafeSound?.stopAll?.();
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
        draw(t);
      }
    }

    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      t += dt;
      if (t >= DUR) {
        t = 0;
        setPlaying(false);
        return;
      }
      draw(t);
      rafId = requestAnimationFrame(tick);
    }

    playBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaying(!playing);
    });
    bigBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaying(!playing);
    });
    canvas.addEventListener('click', () => setPlaying(!playing));
    track?.addEventListener('click', (e) => {
      const r = track.getBoundingClientRect();
      t = Math.max(0, Math.min(DUR, ((e.clientX - r.left) / r.width) * DUR));
      draw(t);
    });
    fsBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) player?.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.();
    });
    recBtn?.addEventListener('click', () => {
      if (recorder) {
        recorder.stop();
        return;
      }
      if (!canvas.captureStream || !window.MediaRecorder) return;
      const stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chatsafe-urimai-explainer.webm';
        a.click();
        recorder = null;
        if (recBtn) recBtn.innerHTML = ICON_DL;
      };
      recorder.start();
      if (recBtn) recBtn.innerHTML = ICON_STOP;
      t = 0;
      setPlaying(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && playing) setPlaying(false);
    });
    window.addEventListener('pagehide', () => setPlaying(false));
    window.ChatSafeExplainerStop = () => setPlaying(false);

    draw(0);
  }

  window.createVideoExplainer = createVideoExplainer;
})();
