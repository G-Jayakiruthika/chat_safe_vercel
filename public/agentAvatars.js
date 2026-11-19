'use strict';

/**
 * agentAvatars.js — Animated 3D-shaded guardian & AI agent squad avatars
 * (inspired by SkillForge AI's doll avatars, built in pure Canvas 2D so CSP stays strict).
 *
 * 8 Specialized Agents on the Chat_Safe × Urimai Bus:
 *   1. kavach    — Scam Guardian & 3D Voice Agent
 *   2. urimai    — Civic Grievance & Legal Drafter
 *   3. vani      — 23-Language Speech & Speed-Dial '9' IVR Agent
 *   4. netra     — Scam X-Ray & PII Auto-Redactor
 *   5. payguard  — SEBI @valid UPI & Financial Shield
 *   6. paati     — Kamala Paati Scam-Baiter Decoy
 *   7. setu      — O2O Family & Local Proxy Coordinator
 *   8. drishti   — Daily Video News & Radar Verifier
 */
(() => {
  const AGENTS = [
    { id: 'kavach', name: 'Kavach', role: '3D Voice & Scam Guardian', color: '#22d3ee', badge: '🛡️', hat: 'visor', item: 'shield', line: 'I listen in 23 languages and stop cyber scams before money moves.' },
    { id: 'urimai', name: 'Urimai', role: 'Civic Legal Drafter', color: '#3b82f6', badge: '⚖️', hat: 'halo', item: 'scroll', line: 'I turn spoken village problems into bilingual official petitions & CM portal filings.' },
    { id: 'vani', name: 'Vani', role: "Speed-Dial '9' Voice IVR", color: '#a855f7', badge: '📞', hat: 'headset', item: 'mic', line: 'I answer keypad phones on speed-dial 9 and route Scam vs Civic intent via Gemini.' },
    { id: 'netra', name: 'Netra', role: 'X-Ray & PII Redactor', color: '#f43f5e', badge: '🔬', hat: 'glasses', item: 'lens', line: 'I mask personal names, Aadhaar & phone numbers on Radar with [REDACTED].' },
    { id: 'payguard', name: 'Pay-Guard', role: 'SEBI @valid Checker', color: '#10b981', badge: '💳', hat: 'cap', item: 'coin', line: 'I verify broker UPI handles against SEBI @valid rules in real time.' },
    { id: 'paati', name: 'Kamala Paati', role: 'AI Decoy Grandma', color: '#f59e0b', badge: '👵', hat: 'bun', item: 'cup', line: 'I waste scammers’ time politely about filter coffee & serials — zero real OTPs.' },
    { id: 'setu', name: 'Setu', role: 'O2O & Proxy Bridge', color: '#06b6d4', badge: '🤝', hat: 'antenna', item: 'bridge', line: 'I route Scam & Urimai Action Kits to family smartphones, laptops, or Local Proxy neighbors anywhere.' },
    { id: 'drishti', name: 'Drishti', role: 'Video News & Radar AI', color: '#ec4899', badge: '🎬', hat: 'beret', item: 'cam', line: 'I verify daily scam video reels and track local ward & city threats.' },
  ];

  function drawBot(ctx, w, h, spec, t, mood = 'idle') {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.54;
    const s = Math.min(w, h) * 0.34;
    const bob = Math.sin(t * 2.5) * s * 0.06 + (mood === 'cheer' ? -Math.abs(Math.sin(t * 7)) * s * 0.18 : 0);

    // Glow halo
    const g = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 1.45);
    g.addColorStop(0, `${spec.color}44`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 1.05, s * 0.55, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    const bodyGrad = ctx.createLinearGradient(cx - s * 0.5, cy, cx + s * 0.5, cy + s * 0.9);
    bodyGrad.addColorStop(0, spec.color);
    bodyGrad.addColorStop(1, '#111827');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(cx - s * 0.42, cy + bob + s * 0.12, s * 0.84, s * 0.72, s * 0.28);
    ctx.fill();

    // Chest badge
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy + bob + s * 0.46, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(s * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.badge, cx, cy + bob + s * 0.47);

    // Arms
    const waveAngle = mood === 'talk' ? Math.sin(t * 10) * 0.35 : Math.sin(t * 2) * 0.08;
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = s * 0.18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.45, cy + bob + s * 0.24);
    ctx.lineTo(cx - s * 0.68, cy + bob + s * 0.56 + waveAngle * s * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.45, cy + bob + s * 0.24);
    ctx.lineTo(cx + s * 0.68, cy + bob + s * 0.52 - waveAngle * s * 0.4);
    ctx.stroke();

    // Head
    const hy = cy + bob - s * 0.36;
    const headGrad = ctx.createRadialGradient(cx - s * 0.15, hy - s * 0.15, s * 0.05, cx, hy, s * 0.48);
    headGrad.addColorStop(0, '#ffe3c8');
    headGrad.addColorStop(1, '#e0ac82');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(cx, hy, s * 0.44, 0, Math.PI * 2);
    ctx.fill();

    // Visor / eyes
    const blink = (t % 3.6) < 0.12 ? 0.15 : 1;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.15, hy - s * 0.02, s * 0.06, s * 0.075 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + s * 0.15, hy - s * 0.02, s * 0.06, s * 0.075 * blink, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255,120,140,0.45)';
    ctx.beginPath();
    ctx.arc(cx - s * 0.26, hy + s * 0.08, s * 0.065, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.26, hy + s * 0.08, s * 0.065, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(2, s * 0.045);
    ctx.beginPath();
    if (mood === 'talk') {
      ctx.ellipse(cx, hy + s * 0.16, s * 0.08, s * (0.04 + Math.abs(Math.sin(t * 14)) * 0.05), 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, hy + s * 0.12, s * 0.11, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();

    // Signature Hat / Gear
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = spec.color;
    if (spec.hat === 'halo') {
      ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.beginPath();
      ctx.ellipse(cx, hy - s * 0.56, s * 0.3, s * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (spec.hat === 'antenna') {
      ctx.lineWidth = Math.max(2, s * 0.04);
      ctx.beginPath();
      ctx.moveTo(cx, hy - s * 0.42);
      ctx.lineTo(cx, hy - s * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, hy - s * 0.68, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.hat === 'visor') {
      ctx.fillStyle = `${spec.color}cc`;
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.34, hy - s * 0.11, s * 0.68, s * 0.16, s * 0.07);
      ctx.fill();
    } else if (spec.hat === 'headset') {
      ctx.lineWidth = Math.max(2, s * 0.06);
      ctx.beginPath();
      ctx.arc(cx, hy, s * 0.47, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.47, hy, s * 0.1, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.47, hy, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.hat === 'bun') {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, hy - s * 0.46, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.hat === 'glasses') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, s * 0.035);
      ctx.beginPath();
      ctx.arc(cx - s * 0.15, hy - s * 0.02, s * 0.11, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.15, hy - s * 0.02, s * 0.11, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.06, hy - s * 0.4, s * 0.36, s * 0.12, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function mountAgentGrid(container) {
    if (!container) return;
    container.innerHTML = AGENTS.map((a) => `
      <article class="agent-card glass" data-agent="${a.id}" tabindex="0">
        <canvas width="180" height="180" data-agent-canvas="${a.id}" aria-label="${a.name}, ${a.role}"></canvas>
        <div class="agent-meta">
          <span class="agent-role mono" style="color:${a.color}">${a.role}</span>
          <h3>${a.name}</h3>
          <p>${a.line}</p>
        </div>
      </article>
    `).join('');

    const canvases = [...container.querySelectorAll('canvas[data-agent-canvas]')];
    const moods = {};
    canvases.forEach((c) => {
      const id = c.dataset.agentCanvas;
      const card = c.closest('.agent-card');
      card.addEventListener('pointerenter', () => { moods[id] = 'talk'; });
      card.addEventListener('pointerleave', () => { moods[id] = 'idle'; });
      card.addEventListener('click', () => { moods[id] = 'cheer'; setTimeout(() => { moods[id] = 'idle'; }, 1200); });
    });

    const loop = (now) => {
      const t = now / 1000;
      const still = document.body.classList.contains('no-motion') || document.body.classList.contains('minimal');
      for (const c of canvases) {
        if (!c.isConnected || c.offsetParent === null) continue;
        const r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const spec = AGENTS.find((a) => a.id === c.dataset.agentCanvas);
        if (spec) drawBot(c.getContext('2d'), c.width, c.height, spec, still ? 0.5 : t, moods[spec.id] || 'idle');
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  window.ChatSafeAgents = { AGENTS, mountAgentGrid };
})();
