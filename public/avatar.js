'use strict';

/**
 * Kavach — Chat_Safe × Urimai's 3D cyber & civic guardian avatar.
 * Pure Canvas 2D with a hand-rolled 3D pipeline (icosphere mesh, rotation matrices,
 * perspective projection, depth shading). No external libraries.
 *
 *  - States: idle · listening · thinking · speaking
 *  - Moods tint the shield AND change the eyes:
 *      idle -> calm cyan · safe -> happy emerald · civic -> helpful royal blue (Urimai)
 *      suspicious -> skeptical squint · high -> angry orange · critical -> furious red
 */
(() => {
  const MOOD_COLORS = Object.freeze({
    idle: [34, 211, 238],
    safe: [52, 211, 153],
    civic: [59, 130, 246],
    suspicious: [251, 191, 36],
    high: [251, 146, 60],
    critical: [248, 113, 113],
  });

  const EXPRESSIONS = Object.freeze({
    calm: { open: 1, lidOuter: 0.05, lidInner: 0.05, smile: 0, pupil: 0.3, brow: 0, browAngle: 0, browSkew: 0 },
    happy: { open: 1.05, lidOuter: 0.08, lidInner: 0.08, smile: 0.72, pupil: 0.3, brow: -0.22, browAngle: -0.14, browSkew: 0 },
    civic: { open: 1.08, lidOuter: 0.04, lidInner: 0.04, smile: 0.45, pupil: 0.32, brow: -0.18, browAngle: -0.1, browSkew: 0 },
    squint: { open: 0.85, lidOuter: 0.42, lidInner: 0.38, smile: 0, pupil: 0.27, brow: 0.16, browAngle: 0.16, browSkew: 0.42 },
    angry: { open: 1, lidOuter: 0.05, lidInner: 0.5, smile: 0.12, pupil: 0.22, brow: 0.1, browAngle: 0.44, browSkew: 0 },
    furious: { open: 1.05, lidOuter: 0, lidInner: 0.62, smile: 0.18, pupil: 0.14, brow: 0.16, browAngle: 0.62, browSkew: 0 },
    wide: { open: 1.25, lidOuter: 0, lidInner: 0, smile: 0, pupil: 0.36, brow: -0.42, browAngle: -0.06, browSkew: 0 },
    thinking: { open: 0.95, lidOuter: 0.22, lidInner: 0.22, smile: 0, pupil: 0.26, brow: -0.16, browAngle: 0.12, browSkew: 0.3 },
    surprised: { open: 1.35, lidOuter: 0, lidInner: 0, smile: 0, pupil: 0.16, brow: -0.55, browAngle: -0.12, browSkew: 0 },
  });
  const MOOD_EXPRESSION = { idle: 'calm', safe: 'happy', civic: 'civic', suspicious: 'squint', high: 'angry', critical: 'furious' };

  function normalize([x, y, z]) {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  }

  function buildIcosphere() {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
      [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ].map(normalize);
    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    const midCache = new Map();
    const mid = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!midCache.has(key)) {
        verts.push(normalize(verts[a].map((v, i) => (v + verts[b][i]) / 2)));
        midCache.set(key, verts.length - 1);
      }
      return midCache.get(key);
    };
    faces = faces.flatMap(([a, b, c]) => {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
    const seen = new Set();
    const edges = [];
    for (const [a, b, c] of faces) {
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const key = p < q ? `${p}_${q}` : `${q}_${p}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([p, q]);
        }
      }
    }
    return { verts, edges };
  }

  function rotate([x, y, z], ry, rx) {
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
  }

  const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const lerpExpr = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + (b[key] - a[key]) * k]));

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function createKavach(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const mesh = buildIcosphere();
    const ring = Array.from({ length: 72 }, (_, i) => (i / 72) * Math.PI * 2);
    const reduced = Boolean(opts.reducedMotion);
    const mini = Boolean(opts.mini);

    let w = 0;
    let h = 0;
    let state = 'idle';
    let mood = MOOD_COLORS[opts.mood] ? opts.mood : 'idle';
    let color = MOOD_COLORS[mood];
    let expr = { ...EXPRESSIONS[MOOD_EXPRESSION[mood]] };
    let mouth = 0;
    let mouthTarget = 0;
    let pointer = { x: 0, y: 0 };
    let tilt = { x: 0, y: 0 };
    let spin = 0;
    let spinVel = 0;
    let drag = null;
    let nextBlink = 1.5 + Math.random() * 2;
    let blink = 0;
    let alertUntil = 0;
    let surpriseUntil = 0;
    let dark = true;
    let visible = true;
    let zoom = 1;
    let zoomTarget = 1;
    let last = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2))),
      };
      if (drag) {
        const dx = e.clientX - drag.x;
        drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y);
        spinVel = dx * 0.6;
        spin += dx * 0.012;
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    }

    function onPointerDown(e) {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      canvas.setPointerCapture?.(e.pointerId);
    }

    function onPointerUp() {
      if (drag && drag.moved < 6) poke();
      drag = null;
    }

    function poke() {
      surpriseUntil = performance.now() + 700;
      spinVel += 6;
      opts.onPoke?.();
    }

    function zoomBy(factor) {
      zoomTarget = Math.max(0.65, Math.min(1.9, zoomTarget * factor));
    }

    function resetView() {
      zoomTarget = 1;
      spinVel = 0;
      spin = 0;
      pointer = { x: 0, y: 0 };
    }

    function targetExpression(now) {
      if (now < surpriseUntil) return EXPRESSIONS.surprised;
      if (state === 'listening') return EXPRESSIONS.wide;
      if (state === 'thinking') return EXPRESSIONS.thinking;
      return EXPRESSIONS[MOOD_EXPRESSION[mood]];
    }

    function lookAt(time) {
      if (state === 'thinking') return { x: 0.55 * Math.cos(time * 3), y: -0.45 + 0.15 * Math.sin(time * 3) };
      if (mood === 'critical' && state !== 'listening') return { x: Math.sin(time * 9) * 0.55, y: 0 };
      if (mood === 'suspicious' && state === 'idle') return { x: Math.sign(Math.sin(time * 1.2)) * 0.65, y: 0.1 };
      return { x: pointer.x * 0.8, y: pointer.y * 0.6 };
    }

    function drawEye(ex, ey, ew, ehBase, side, look, time, visorFill) {
      const eh = ehBase * expr.open;
      const closed = blink;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = rgba(color, 0.95);
      ctx.fillRect(ex - ew, ey - eh, ew * 2, eh * 2);

      const pr = ew * expr.pupil * (state === 'listening' ? 1.1 : 1);
      const px = ex + look.x * (ew - pr) * 0.75;
      const py = ey + look.y * (eh - pr) * 0.6;
      ctx.fillStyle = visorFill;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.28, 0, Math.PI * 2);
      ctx.fill();

      const inner = side === -1 ? ex + ew : ex - ew;
      const outer = side === -1 ? ex - ew : ex + ew;
      const lidInnerY = ey - eh + 2 * eh * Math.min(1, expr.lidInner + closed);
      const lidOuterY = ey - eh + 2 * eh * Math.min(1, expr.lidOuter + closed);
      ctx.fillStyle = visorFill;
      ctx.beginPath();
      ctx.moveTo(outer, ey - eh * 2);
      ctx.lineTo(inner, ey - eh * 2);
      ctx.lineTo(inner, lidInnerY);
      ctx.lineTo(outer, lidOuterY);
      ctx.closePath();
      ctx.fill();

      if (expr.smile > 0.01) {
        ctx.beginPath();
        ctx.moveTo(ex - ew * 1.2, ey + eh * 1.5);
        ctx.lineTo(ex - ew * 1.2, ey + eh);
        ctx.quadraticCurveTo(ex, ey + eh - eh * 2 * expr.smile * 1.6, ex + ew * 1.2, ey + eh);
        ctx.lineTo(ex + ew * 1.2, ey + eh * 1.5);
        ctx.closePath();
        ctx.fill();
      }

      if (mood === 'critical' && !reduced) {
        const sy = ey - eh + ((time * 2.5) % 1) * eh * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(ex - ew, sy, ew * 2, 2);
      }
      ctx.restore();

      ctx.strokeStyle = rgba(color, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, ew + 2, eh + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawBrow(ex, ey, ew, eh, side) {
      const skew = side === -1 ? expr.browSkew : 0;
      const y = ey - eh * (1.55 + skew * 0.5) + eh * expr.brow;
      const angle = (expr.browAngle + skew * -0.5) * side;
      const bw = ew * 2.25;
      const bh = Math.max(2.5, eh * 0.3);
      ctx.save();
      ctx.translate(ex, y);
      ctx.rotate(angle);
      ctx.fillStyle = rgba(color, 0.92);
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fill();
      ctx.restore();
    }

    function drawFace(vx, vy, vw, vh, time) {
      const visorFill = dark ? 'rgb(5,12,26)' : 'rgb(12,24,44)';
      ctx.save();
      ctx.translate(vx, vy);
      ctx.rotate(tilt.y * -0.12);
      ctx.fillStyle = visorFill;
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.lineWidth = 2;
      ctx.shadowColor = rgba(color, 0.8);
      ctx.shadowBlur = 18;
      roundRect(ctx, -vw / 2, -vh / 2, vw, vh, vh / 2.4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      const look = lookAt(time);
      const ew = vw * 0.13;
      const eh = vh * 0.24;
      ctx.shadowColor = rgba(color, 1);
      ctx.shadowBlur = 12;
      for (const side of [-1, 1]) {
        drawEye(side * vw * 0.21, -vh * 0.02, ew, eh, side, look, time, visorFill);
        drawBrow(side * vw * 0.21, -vh * 0.02, ew, eh, side);
      }
      ctx.shadowBlur = 0;

      ctx.fillStyle = rgba(color, 1);
      const bars = 7;
      const bw = vw * 0.04;
      for (let i = 0; i < bars; i++) {
        const k = 1 - Math.abs(i - (bars - 1) / 2) / bars;
        const bh = 3 + mouth * vh * 0.28 * k * (0.6 + 0.4 * Math.sin(time * 22 + i * 1.7));
        ctx.fillRect((i - (bars - 1) / 2) * bw * 1.7 - bw / 2, vh * 0.3 - bh / 2, bw, bh);
      }

      if (state === 'thinking' && !reduced) {
        const sy = -vh / 2 + ((time * 1.6) % 1) * vh;
        const g = ctx.createLinearGradient(0, sy - 10, 0, sy + 10);
        g.addColorStop(0, rgba(color, 0));
        g.addColorStop(0.5, rgba(color, 0.55));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-vw / 2 + 6, sy - 10, vw - 12, 20);
      }
      ctx.restore();
    }

    function drawFrame(now) {
      requestAnimationFrame(drawFrame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;
      const still = reduced || document.body.classList.contains('no-motion');
      const speed = still ? 0.1 : 1;

      color = mix(color, MOOD_COLORS[mood], Math.min(1, dt * 4));
      expr = lerpExpr(expr, targetExpression(now), Math.min(1, dt * 8));
      tilt.x += (pointer.y * 0.35 - tilt.x) * Math.min(1, dt * 3);
      tilt.y += (pointer.x * 0.5 - tilt.y) * Math.min(1, dt * 3);
      if (state === 'speaking') mouthTarget = Math.max(mouthTarget * 0.9, 0.25 + 0.35 * Math.abs(Math.sin(time * 14)));
      else mouthTarget *= 0.85;
      mouth += (mouthTarget - mouth) * Math.min(1, dt * 18);

      const baseSpin = { idle: 0.25, listening: 0.45, thinking: 2.2, speaking: 0.5 }[state] * speed;
      spinVel *= Math.pow(0.04, dt);
      spin += dt * (baseSpin + spinVel);
      zoom += (zoomTarget - zoom) * Math.min(1, dt * 6);

      nextBlink -= dt;
      if (nextBlink <= 0) {
        blink = 1;
        nextBlink = (mood === 'critical' ? 4 : 2.5) + Math.random() * 3;
      }
      blink = Math.max(0, blink - dt * 7);

      ctx.clearRect(0, 0, w, h);
      const shake = !still && now < alertUntil ? Math.sin(time * 60) * 3 : 0;

      if (mini) {
        const vw = w * 0.86 * zoom;
        drawFace(w / 2 + shake, h / 2, vw, vw * 0.6, time);
        return;
      }

      const cx = w / 2 + shake;
      const cy = h / 2 + (still ? 0 : Math.sin(time * 1.3) * 4);
      const R = Math.min(w, h) * 0.3 * zoom;
      const persp = 3.2;

      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.8);
      halo.addColorStop(0, rgba(color, dark ? 0.35 : 0.22));
      halo.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      if (state === 'listening') {
        for (let i = 0; i < 3; i++) {
          const p = (time * 0.8 + i / 3) % 1;
          ctx.strokeStyle = rgba(color, (1 - p) * 0.6);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, R * (1.05 + p * 0.7), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      const projected = mesh.verts.map((v) => {
        const [x, y, z] = rotate(v, spin + tilt.y, tilt.x + 0.15);
        const s = persp / (persp - z);
        return { x: cx + x * R * s, y: cy + y * R * s, z };
      });
      ctx.lineWidth = 1.2;
      for (const [a, b] of mesh.edges) {
        const pa = projected[a];
        const pb = projected[b];
        ctx.strokeStyle = rgba(color, 0.08 + ((pa.z + pb.z) / 2 + 1) * 0.28);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      for (const p of projected) {
        if (p.z < 0) continue;
        ctx.fillStyle = rgba(color, 0.4 + p.z * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 + p.z * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const a0 of ring) {
        const a = a0 + time * 0.6 * speed * (state === 'thinking' ? 3 : 1);
        const [x, y, z] = rotate([Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45], 0, 1.15 + tilt.x);
        const s = persp / (persp - z);
        ctx.fillStyle = rgba(color, z > 0 ? 0.85 : 0.25);
        ctx.fillRect(cx + x * R * s - 1.5, cy + y * R * s - 1.5, 3, 3);
      }

      const [fx, fy, fz] = rotate([0, 0.05, 1], tilt.y * 0.8, tilt.x * 0.8);
      const fs = persp / (persp - fz);
      drawFace(cx + fx * R * 0.55 * fs, cy + fy * R * 0.55 * fs, R * 1.15, R * 0.7, time);
    }

    resize();
    new ResizeObserver(resize).observe(canvas);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    if (!mini) {
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
      }, { passive: false });
      canvas.addEventListener('keydown', (e) => {
        const keys = {
          Enter: poke,
          ' ': poke,
          ArrowLeft: () => { spinVel -= 4; },
          ArrowRight: () => { spinVel += 4; },
          ArrowUp: () => zoomBy(1.12),
          ArrowDown: () => zoomBy(1 / 1.12),
          '+': () => zoomBy(1.15),
          '=': () => zoomBy(1.15),
          '-': () => zoomBy(1 / 1.15),
          r: resetView,
          R: resetView,
        };
        const fn = keys[e.key];
        if (fn) {
          e.preventDefault();
          fn();
        }
      });
    }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(canvas);
    requestAnimationFrame(drawFrame);

    return {
      setState(s) { state = s; },
      setMood(m) {
        mood = MOOD_COLORS[m] ? m : 'idle';
        if (mood === 'critical' || mood === 'high') alertUntil = performance.now() + 700;
      },
      pulse() { mouthTarget = 0.9; },
      poke,
      zoomBy,
      resetView,
      setDark(isDark) { dark = isDark; },
      get mood() { return mood; },
    };
  }

  window.createKavach = createKavach;
  window.KAVACH_MOOD_COLORS = MOOD_COLORS;
})();
