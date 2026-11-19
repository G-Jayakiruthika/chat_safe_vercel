'use strict';

/**
 * The wordless explainer, built like a village safety poster rather than a slideshow:
 * all three panels are visible at once, left to right, with big arrows between them, so
 * the whole story is grasped in one look even by someone who cannot read.
 *
 *   ❶ RED    a stranger on the phone pulls money out of your pocket
 *   ❷ BLUE   Chat_Safe's shield looks at the call
 *   ❸ GREEN  a raised hand stops it, the money stays, and 1930 is dialled
 *
 * Nothing depends on words. Each panel carries a colour (red = danger, blue = checking,
 * green = safe), one large picture, and motion that shows cause and effect. The only
 * characters used are the number 1930 and a ₹ sign.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  /** A pictogram with a spoken-word label for screen readers. */
  function pic(glyph, cls, label) {
    const n = el('span', `xp-pic ${cls}`, glyph);
    n.setAttribute('role', 'img');
    n.setAttribute('aria-label', label);
    return n;
  }

  /** The guardian's face: a shield whose eyes and brows carry the verdict. */
  function shield(state, label) {
    const n = el('span', `xp-shield xp-${state}`);
    n.setAttribute('role', 'img');
    n.setAttribute('aria-label', label);
    const brows = el('span', 'xp-brows');
    brows.append(el('i'), el('i'));
    const eyes = el('span', 'xp-eyes');
    eyes.append(el('i'), el('i'));
    n.append(brows, eyes);
    return n;
  }

  /** A fat arrow between panels, drawn so it reads at any size. */
  function arrow() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 40 24');
    svg.setAttribute('class', 'xp-arrow');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M2 12h30M26 5l8 7-8 7');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '3.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  const PANELS = [
    {
      tone: 'danger',
      step: '1',
      label: 'Step 1. A stranger on the phone takes your money.',
      build: (stage) => {
        stage.append(
          pic('🧓', 'xp-person', 'You'),
          el('span', 'xp-cash xp-cash-out', '₹'),
          pic('📱', 'xp-phone xp-shake', 'A phone call'),
          pic('😠', 'xp-face', 'An angry stranger'),
        );
      },
    },
    {
      tone: 'check',
      step: '2',
      label: 'Step 2. Chat_Safe looks at the call for you.',
      build: (stage) => {
        stage.append(pic('📱', 'xp-phone', 'The same call'), shield('check', 'Chat_Safe checking'), el('span', 'xp-beam'));
      },
    },
    {
      tone: 'safe',
      step: '3',
      label: 'Step 3. You stop, your money stays, and you call 1930.',
      build: (stage) => {
        stage.append(
          pic('✋', 'xp-stop', 'Stop'),
          el('span', 'xp-cash xp-cash-stay', '₹'),
          el('span', 'xp-num', '1930'),
        );
      },
    },
  ];

  /**
   * @param {HTMLElement} root
   * @param {{reducedMotion?: boolean}} [opts]
   */
  function createExplainer(root, opts = {}) {
    const reduced = Boolean(opts.reducedMotion);
    root.classList.add('xp');
    const strip = el('div', 'xp-strip');
    strip.setAttribute('role', 'list');

    const panels = PANELS.map((p, i) => {
      const panel = el('div', `xp-panel xp-tone-${p.tone}`);
      panel.setAttribute('role', 'listitem');
      panel.setAttribute('aria-label', p.label);
      const badge = el('span', 'xp-step', p.step);
      badge.setAttribute('aria-hidden', 'true');
      const stage = el('div', 'xp-stage');
      p.build(stage);
      panel.append(badge, stage);
      strip.append(panel);
      if (i < PANELS.length - 1) {
        const a = el('div', 'xp-arrow-wrap');
        a.append(arrow());
        strip.append(a);
      }
      return panel;
    });

    root.append(strip);

    // Each panel lights up in turn, so the eye is led left to right.
    let i = 0;
    let timer = null;
    const light = (n) => panels.forEach((p, k) => p.classList.toggle('lit', k === n));
    const tick = () => {
      i = (i + 1) % panels.length;
      light(i);
    };
    const play = () => {
      clearInterval(timer);
      timer = setInterval(tick, 2200);
    };
    const stop = () => clearInterval(timer);

    light(0);
    if (!reduced) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.25 }).observe(root);
    } else {
      panels.forEach((p) => p.classList.add('lit'));
    }
    return { play, stop };
  }

  window.createExplainer = createExplainer;
})();
