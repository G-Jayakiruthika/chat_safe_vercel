'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(document.querySelectorAll('.stage'));
  const NAMES = {
    globe: 'GLOBE · CONNECTED BHARAT',
    attack: 'ATTACK · SCAMS & CIVIC GAPS',
    shield: 'SHIELD · KAVACH & URIMAI',
    lock: 'LOCK · O2O & CM PORTAL',
    ring: 'RING · 23 LANGUAGES',
    eye: 'EYE · KAVACH WATCHING',
  };
  const isDark = () => document.documentElement.dataset.theme !== 'light';

  /* ---------- Preloader with percentage counter + scramble label ---------- */
  (() => {
    const boot = $('boot');
    if (!boot) return;
    const pctEl = $('bootPct');
    const barEl = document.querySelector('#boot .boot-bar span');
    const labelEl = $('bootLabel');
    const targetText = 'IGNITING KAVACH × URIMAI';
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789×';
    let pct = 0;

    const timer = setInterval(() => {
      pct = Math.min(100, pct + (reducedMotion ? 50 : 8));
      if (pctEl) pctEl.textContent = `${pct}%`;
      if (barEl) barEl.style.width = `${pct}%`;
      if (labelEl && !reducedMotion) {
        const reveal = Math.floor((pct / 100) * targetText.length);
        labelEl.textContent = targetText
          .split('')
          .map((ch, i) => (i < reveal || ch === ' ' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]))
          .join('');
      }
      if (pct >= 100) {
        clearInterval(timer);
        if (labelEl) labelEl.textContent = targetText;
        setTimeout(() => {
          boot.classList.add('done');
          setTimeout(() => boot.remove(), 700);
        }, reducedMotion ? 50 : 220);
      }
    }, reducedMotion ? 30 : 40);
  })();

  /* ---------- 60-Second Interactive Video Explainer (Hero Top) ---------- */
  if (window.createVideoExplainer && $('videoExplainer')) {
    window.createVideoExplainer({
      canvas: $('videoExplainer'),
      caption: $('playerCaption'),
      fill: $('playerFill'),
      timeEl: $('playerTime'),
      playBtn: $('playerPlay'),
      bigBtn: $('playerBig'),
      track: $('playerTrack'),
      chaptersEl: $('playerChapters'),
      recBtn: $('playerRec'),
      fsBtn: $('playerFs'),
      player: $('videoPlayer'),
    });
  }

  /* ---------- 8 AI Agents Squad ---------- */
  if (window.ChatSafeAgents && $('agentGrid')) {
    window.ChatSafeAgents.mountAgentGrid($('agentGrid'));
  }

  /* ---------- The eight scam types ---------- */
  (() => {
    const grid = $('typeGrid');
    if (!grid || !window.SCAM_TYPES) return;
    let learned = [];
    try {
      learned = (localStorage.getItem('chatsafe.learned') || '').split(',');
    } catch { /* ignore */ }

    grid.replaceChildren(...window.SCAM_TYPES.map((t, i) => {
      const card = document.createElement('a');
      card.className = `type-card${learned.includes(t.id) ? ' learned' : ''}`;
      card.href = `app.html?try=${encodeURIComponent(t.id)}`;
      card.style.animationDelay = `${i * 60}ms`;
      const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        n.className = cls;
        n.textContent = text;
        return n;
      };
      const ico = el('span', 'ico');
      ico.append(window.scamIcon ? window.scamIcon(t.id, 34) : document.createTextNode(t.icon));
      card.append(ico, el('span', 'nm', t.name), el('p', 'says', `\u201c${t.says}\u201d`), el('p', 'rule', t.rule), el('span', 'cta', 'Try this one \u2192'));
      if (learned.includes(t.id)) {
        const b = el('span', 'badge-learned', '\u2705');
        b.title = 'You have already seen this one';
        card.append(b);
      }
      return card;
    }));
  })();

  /* ---------- Scroll morph + HUD ---------- */
  const morph = window.createMorph($('morph'), {
    sections,
    reducedMotion,
    onIndex: (i) => {
      $('hudIndex').textContent = `${String(i + 1).padStart(4, '0')} / ${String(sections.length).padStart(4, '0')}`;
      $('hudName').textContent = NAMES[sections[i]?.dataset.shape] || '';
      $('hudNum').textContent = String(i + 1).padStart(2, '0');
      $('hudTotal').textContent = `/ ${String(sections.length).padStart(2, '0')}`;
      $('hudNext').textContent = i + 1 < sections.length ? 'NEXT ↓' : 'TOP ↑';
      const pal = sections[i]?.dataset.paletteName;
      if (pal && window.ChatSafeTheme?.isAutoPalette?.()) {
        document.documentElement.dataset.palette = pal;
      }
    },
  });
  morph.setDark(isDark());

  /* ---------- Reveal on scroll + count-up stats ---------- */
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const fmt = (v) => `${el.dataset.prefix || ''}${v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${el.dataset.suffix || ''}`;
    if (reducedMotion) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1400);
      el.textContent = fmt(to * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(e.target);
    }
  }, { threshold: 0.25 });
  document.querySelectorAll('.reveal-on-scroll').forEach((el) => io.observe(el));

  /* ---------- Eye showcase ---------- */
  const eyes = [];
  document.querySelectorAll('.eye-row canvas').forEach((c) => {
    const k = window.createKavach(c, { mini: true, reducedMotion, mood: c.dataset.mood });
    k.setDark(isDark());
    eyes.push(k);
  });

  /* ---------- Scroll-driven 3D phone demonstration ---------- */
  (() => {
    const section = $('how');
    if (!section) return;
    const pills = Array.from(section.querySelectorAll('.step-pill'));
    const screens = Array.from(section.querySelectorAll('.ps'));
    const chips = Array.from(section.querySelectorAll('[class*="chip-"]'));
    const COPY = [
      ['Single Voice Prompt', "Rural parents press '9' on their keypad phone. Vani answers in Tamil, Hindi, or any of 23 Indian languages: \"Vanakkam. Tell me what happened.\""],
      ['Gemini Intent Router', 'Gemini classifies the speech instantly: bank OTP or digital arrest goes to Kavach (Red); broken water pipe or road goes to Urimai (Blue).'],
      ['Multi-Modal O2O Handoff', "Son receives Father's voice recording, bilingual PDF with photo + 5-signature block, OR 1-click CM Helpline / Local Proxy WhatsApp link."],
    ];
    const CHIPS = [[0, 2], [1, 2], [2, 3]];
    let step = -1;
    let timer = null;

    function show(next) {
      if (next === step) return;
      step = next;
      pills.forEach((p, i) => {
        const on = i === step;
        p.setAttribute('aria-current', String(on));
        p.querySelector('.n').textContent = on ? `Step 0${i + 1}` : `0${i + 1}`;
      });
      screens.forEach((el, i) => el.classList.toggle('on', i === step));
      chips.forEach((c, i) => c.classList.toggle('chip-on', CHIPS[step].includes(i)));
      section.querySelector('.demo-title').textContent = COPY[step][0];
      section.querySelector('.demo-text').textContent = COPY[step][1];
    }

    function autoplay() {
      clearInterval(timer);
      timer = setInterval(() => show((step + 1) % pills.length), 3200);
    }

    pills.forEach((p, i) =>
      p.addEventListener('click', () => {
        show(i);
        clearInterval(timer);
      }),
    );

    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          show(Math.max(0, step));
          if (!reducedMotion) autoplay();
        } else {
          clearInterval(timer);
        }
      },
      { threshold: 0.4 },
    ).observe(section);
    show(0);
  })();

  /* ---------- Theme toggle ---------- */
  $('themeToggle')?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    window.ChatSafeTheme?.set('mode', next);
    morph.setDark(next === 'dark');
    eyes.forEach((k) => k.setDark(next === 'dark'));
  });
  window.ChatSafeTheme?.onChange?.((s) => {
    morph.setDark(!s.light);
    eyes.forEach((k) => k.setDark(!s.light));
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
