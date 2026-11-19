'use strict';

/**
 * Scroll-driven 3D particle morph for the landing page.
 * 1,200 points smoothly morph between cybersecurity shapes as you scroll:
 *   globe (connected India) → attack burst (scams spreading) → shield → padlock
 *   → data ring (languages) → Kavach's eye.
 * Each <section data-shape="…"> picks the shape; scroll position between two sections
 * blends them. Rendered with Canvas 2D + a hand-written perspective projection.
 */
(() => {
  const N = 1200;
  const TAU = Math.PI * 2;

  /** Deterministic pseudo-random so shapes are stable between reloads. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const SHAPES = {
    globe() {
      // Fibonacci sphere + a few "orbit" points for satellites.
      const pts = [];
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        pts.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r]);
      }
      return pts;
    },
    attack() {
      // Clusters bursting outward: scams spreading through the network.
      const rand = rng(7);
      const centers = Array.from({ length: 9 }, () => [rand() * 2.6 - 1.3, rand() * 1.8 - 0.9, rand() * 1.6 - 0.8]);
      return Array.from({ length: N }, (_, i) => {
        const c = centers[i % centers.length];
        const r = Math.pow(rand(), 0.5) * 0.45;
        const a = rand() * TAU;
        const b = Math.acos(2 * rand() - 1);
        return [c[0] + r * Math.sin(b) * Math.cos(a), c[1] + r * Math.cos(b), c[2] + r * Math.sin(b) * Math.sin(a)];
      });
    },
    shield() {
      // Filled shield silhouette with a domed front.
      const rand = rng(11);
      const inside = (x, y) => {
        if (y > 0.85 || y < -1.05) return false;
        if (y >= 0) return Math.abs(x) <= 0.85 - 0.12 * y * y;
        const half = 0.85 * Math.sqrt(Math.max(0, 1 - Math.pow(-y / 1.05, 2.2)));
        return Math.abs(x) <= half;
      };
      const pts = [];
      while (pts.length < N) {
        const x = rand() * 2 - 1;
        const y = rand() * 2 - 1.1;
        if (!inside(x, y)) continue;
        const edge = pts.length % 3 === 0;
        const z = (edge ? 0.25 : 0.32) * (1 - (x * x + y * y) * 0.5) * (rand() > 0.5 ? 1 : -0.4);
        pts.push([x, -y * 0.95 + 0.05, z]);
      }
      return pts;
    },
    lock() {
      const rand = rng(23);
      const pts = [];
      const body = Math.floor(N * 0.7);
      while (pts.length < body) {
        // points on the surface of a rounded box
        const face = Math.floor(rand() * 6);
        const u = rand() * 2 - 1;
        const v = rand() * 2 - 1;
        const W = 0.75;
        const H = 0.55;
        const D = 0.3;
        const p = [
          [W, u * H, v * D], [-W, u * H, v * D], [u * W, H, v * D],
          [u * W, -H, v * D], [u * W, v * H, D], [u * W, v * H, -D],
        ][face];
        pts.push([p[0], p[1] + 0.35, p[2]]);
      }
      while (pts.length < N) {
        // shackle: half torus above the body
        const a = rand() * Math.PI;
        const b = rand() * TAU;
        const R = 0.48;
        const r = 0.09;
        pts.push([(R + r * Math.cos(b)) * Math.cos(a), -0.2 - (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)]);
      }
      return pts;
    },
    ring() {
      // Torus: 23 languages orbiting together.
      const rand = rng(31);
      return Array.from({ length: N }, () => {
        const a = rand() * TAU;
        const b = rand() * TAU;
        const R = 1.05;
        const r = 0.22 + rand() * 0.06;
        return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b) * 0.9, (R + r * Math.cos(b)) * Math.sin(a)];
      });
    },
    eye() {
      // Almond eye: eyelid outlines, iris ring and pupil.
      const rand = rng(41);
      return Array.from({ length: N }, (_, i) => {
        const part = i % 10;
        if (part < 4) {
          const x = rand() * 2.4 - 1.2;
          const lid = 0.62 * (1 - Math.pow(x / 1.2, 2));
          return [x, (part < 2 ? -lid : lid) + (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.08];
        }
        const a = rand() * TAU;
        const r = part < 8 ? 0.45 + (rand() - 0.5) * 0.06 : Math.sqrt(rand()) * 0.2;
        return [Math.cos(a) * r, Math.sin(a) * r, 0.12 * (1 - r)];
      });
    },
  };

  /**
   * Shape colours follow the page's current palette, so the background changes
   * identity with the section. Only "attack" stays red, because danger should
   * read the same whatever the palette.
   */
  const ROLE = { globe: '--accent', attack: null, shield: '--accent2', lock: '--accent4', ring: '--accent3', eye: '--accent' };
  const DANGER = [239, 68, 68];
  const probe = document.createElement('span');

  /** Resolve a CSS custom property to [r,g,b], whatever notation it uses. */
  function cssRgb(varName, fallback) {
    try {
      probe.style.color = `var(${varName})`;
      probe.style.display = 'none';
      document.body.append(probe);
      const m = getComputedStyle(probe).color.match(/\d+/g);
      probe.remove();
      return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : fallback;
    } catch {
      return fallback;
    }
  }

  const colorFor = (shape) => (ROLE[shape] ? cssRgb(ROLE[shape], [120, 140, 220]) : DANGER);

  const smooth = (t) => t * t * (3 - 2 * t);


  /**
   * Flowing light ribbons — streams of glowing particles tracing curved paths,
   * read here as network data in motion. Each section bends and recolours them:
   * calm waves for safe traffic, a broken scatter during the attack section,
   * a protective dome at the shield, tight parallel lanes at the lock.
   */
  const RIBBONS = 7;
  const RIB_POINTS = 110;

  function ribbonPoint(r, t, time, mode, turbulence) {
    // Base: a long sine sweep across the screen, each ribbon offset in phase.
    const x = t;
    const spread = 0.26 + r * 0.035;
    let y =
      Math.sin(t * 2.6 + time * 0.35 + r * 0.9) * spread +
      Math.sin(t * 5.1 - time * 0.22 + r * 2.1) * spread * 0.4;

    if (mode === 'attack') {
      // Shattered: the stream breaks into jagged, jittering fragments.
      // Agitated but still flowing — a disturbed stream, not static noise.
      const n = Math.sin((t * 9 + r * 13) * 12.9898) * 43758.5453;
      y += (n - Math.floor(n) - 0.5) * 0.16 * turbulence;
      y += Math.sin(t * 14 + time * 2.4 + r) * 0.05 * turbulence;
    } else if (mode === 'shield') {
      // Bends into a protective dome over the centre.
      const dome = Math.max(0, 1 - Math.abs(t) * 1.15);
      y = y * (1 - dome * 0.85) - dome * (0.22 + r * 0.03);
    } else if (mode === 'lock') {
      // Flattens into tight, ordered lanes.
      y = y * 0.22 + (r - (RIBBONS - 1) / 2) * 0.085;
    } else if (mode === 'ring' || mode === 'eye') {
      // Wraps around the focal object.
      const a = t * Math.PI + time * 0.12 + r * 0.5;
      const rad = 0.42 + r * 0.045;
      return [Math.cos(a) * rad * 1.9, Math.sin(a) * rad];
    }
    return [x, y];
  }

  /** Draw one ribbon as three passes: wide soft glow, mid body, bright core. */
  function strokeRibbon(ctx, pts, col, alpha) {
    const passes = [
      [7, 0.07 * alpha],
      [2.4, 0.16 * alpha],
      [0.9, 0.55 * alpha],
    ];
    for (const [width, a] of passes) {
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        // Quadratic smoothing through the midpoints keeps the curve silky.
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
      }
      ctx.stroke();
    }
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{sections: HTMLElement[], reducedMotion?: boolean, onIndex?: (i: number, f: number) => void}} opts
   */
  function createMorph(canvas, { sections, reducedMotion = false, onIndex }) {
    const ctx = canvas.getContext('2d');
    const cache = {};
    const shapeOf = (name) => (cache[name] = cache[name] || (SHAPES[name] || SHAPES.globe)());
    const names = sections.map((s) => s.dataset.shape || 'globe');
    let w = 0;
    let h = 0;
    let dark = true;
    let pointer = { x: 0, y: 0 };
    let smoothF = 0;
    let lastIndex = -1;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Float index of the section whose centre is at the viewport centre. */
    function scrollIndex() {
      const mid = window.innerHeight / 2;
      const centers = sections.map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      if (mid <= centers[0]) return 0;
      for (let i = 0; i < centers.length - 1; i++) {
        if (mid >= centers[i] && mid <= centers[i + 1]) return i + (mid - centers[i]) / (centers[i + 1] - centers[i]);
      }
      return centers.length - 1;
    }

    function draw(now) {
      const time = now / 1000;
      const target = scrollIndex();
      smoothF += (target - smoothF) * (reducedMotion ? 1 : 0.08);
      const i = Math.min(names.length - 1, Math.floor(smoothF));
      const k = smooth(Math.min(1, smoothF - i));
      const A = shapeOf(names[i]);
      const B = shapeOf(names[Math.min(names.length - 1, i + 1)]);
      const ca = colorFor(names[i]);
      const cb = colorFor(names[Math.min(names.length - 1, i + 1)]);
      const col = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));

      const nearest = Math.round(smoothF);
      if (nearest !== lastIndex) {
        lastIndex = nearest;
        onIndex?.(nearest, smoothF);
      }

      const ry = (reducedMotion ? 0 : time * 0.15) + smoothF * 0.9 + pointer.x * 0.3;
      const rx = 0.25 + pointer.y * 0.2 + Math.sin(smoothF * 1.3) * 0.15;
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      // Place the object on the right on wide screens, centred on phones.
      const ox = w > 900 ? w * 0.68 : w / 2;
      const oy = h / 2;
      const scale = Math.min(w, h) * (w > 900 ? 0.28 : 0.32);
      const persp = 3.4;
      const alphaBase = dark ? 0.85 : 0.75;

      ctx.clearRect(0, 0, w, h);

      // --- Flowing data ribbons, behind the focal shape ---
      const modeA = names[i];
      const modeB = names[Math.min(names.length - 1, i + 1)];
      const mode = k < 0.5 ? modeA : modeB;
      const turbulence = 0.6 + Math.sin(k * Math.PI) * 0.8;
      const ribScale = Math.min(w, h) * 0.75;
      const rcx = w * 0.5;
      const rcy = h * 0.5;
      const ribAlpha = (dark ? 1 : 0.55) * (mode === 'eye' ? 0.6 : 1);
      for (let r = 0; r < RIBBONS; r++) {
        const pts = [];
        for (let pI = 0; pI < RIB_POINTS; pI++) {
          const t = (pI / (RIB_POINTS - 1)) * 2 - 1;
          const [rx, ry] = ribbonPoint(r, t, time + smoothF * 2, mode, turbulence);
          pts.push([rcx + rx * ribScale * 1.15, rcy + ry * ribScale]);
        }
        strokeRibbon(ctx, pts, col, ribAlpha * (0.45 + 0.55 * ((r + 1) / RIBBONS)));
      }

      // Burst outward a little during transitions for a "data scatter" feel.
      const scatter = Math.sin(k * Math.PI) * 0.25;
      for (let p = 0; p < N; p++) {
        const a = A[p];
        const b = B[p];
        let x = a[0] + (b[0] - a[0]) * k;
        let y = a[1] + (b[1] - a[1]) * k;
        let z = a[2] + (b[2] - a[2]) * k;
        if (scatter > 0.01) {
          const n = Math.sin(p * 12.9898) * 43758.5453;
          const j = (n - Math.floor(n) - 0.5) * scatter;
          x += j;
          y -= j * 0.6;
          z += j * 0.4;
        }
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const s = persp / (persp - z2);
        const px = ox + x1 * scale * s;
        const py = oy + y2 * scale * s;
        const depth = (z2 + 1.4) / 2.8;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.12 + depth * alphaBase).toFixed(3)})`;
        const size = 1 + depth * 1.8;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
      // HUD crosshair ring around the object
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.18)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ox, oy, scale * 1.55, 0, TAU);
      ctx.stroke();
      for (let t = 0; t < 4; t++) {
        const a = t * (Math.PI / 2) + (reducedMotion ? 0 : time * 0.2);
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a) * scale * 1.45, oy + Math.sin(a) * scale * 1.45);
        ctx.lineTo(ox + Math.cos(a) * scale * 1.65, oy + Math.sin(a) * scale * 1.65);
        ctx.stroke();
      }
      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
      },
      { passive: true },
    );
    requestAnimationFrame(draw);

    return {
      setDark(v) {
        dark = v;
      },
    };
  }

  window.createMorph = createMorph;
})();
