'use strict';

/**
 * Animated "cyber mesh" background: drifting network nodes, links between near
 * neighbours and data packets travelling along them. Static when reduced motion is on.
 */
(() => {
  function createBackground(canvas, { reducedMotion = false } = {}) {
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let packets = [];
    let w = 0;
    let h = 0;
    let rgb = [34, 211, 238];
    let alpha = 0.5;
    const LINK = 140;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
      packets = [];
      if (reducedMotion) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = rgb;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reducedMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${r},${g},${b},${((1 - d / LINK) * 0.25 * alpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
            if (!reducedMotion && packets.length < 12 && Math.random() < 0.0004) packets.push({ a: n, b: m, t: 0 });
          }
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${(0.5 * alpha).toFixed(3)})`;
        ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
      }
      packets = packets.filter((p) => (p.t += 0.015) < 1);
      for (const p of packets) {
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      draw();
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();
    if (!reducedMotion) requestAnimationFrame(loop);

    return {
      /** @param {[number, number, number]} color @param {number} a */
      setColor(color, a) {
        rgb = color;
        alpha = a;
        if (reducedMotion) draw();
      },
    };
  }

  window.createBackground = createBackground;
})();
