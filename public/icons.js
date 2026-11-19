'use strict';

/**
 * Hand-drawn icons for the eight scam types — one consistent set, built from simple
 * geometry so each one still reads at 28px on a cheap phone. Two tones only: the
 * object in the palette's accent, and the danger detail in red, so the eye lands on
 * the threat first. No emoji, no external files.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';

  /** @type {Record<string, {label: string, draw: (add: Function) => void}>} */
  const ICONS = {
    // A rising chart that turns out to be bait on a hook.
    investment: {
      label: 'A rising profit chart with a fishing hook — bait',
      draw: (add) => {
        add('path', { d: 'M3 19h18', 'stroke-width': 2 });
        add('polyline', { points: '4,16 9,10 13,13 19,5', 'stroke-width': 2.4 });
        add('polyline', { points: '15,5 19,5 19,9', 'stroke-width': 2.4 });
        add('path', { d: 'M12 2v4a2.6 2.6 0 1 1-5.2 0', 'stroke-width': 2, danger: true });
      },
    },
    // A video-call window with a fake badge inside it.
    digital_arrest: {
      label: 'A video call window showing a fake police badge',
      draw: (add) => {
        add('rect', { x: 2.5, y: 4.5, width: 19, height: 15, rx: 2.5, 'stroke-width': 2 });
        add('path', { d: 'M9 10.5 12 8l3 2.5v3.2c0 2-1.4 3.2-3 3.8-1.6-.6-3-1.8-3-3.8Z', 'stroke-width': 1.8, danger: true });
        add('path', { d: 'M2.5 8.2h19', 'stroke-width': 1.4 });
      },
    },
    // A padlock whose keyhole has been replaced by typed-in OTP dots.
    kyc_otp: {
      label: 'A padlock with a one-time password being typed in',
      draw: (add) => {
        add('rect', { x: 4, y: 10, width: 16, height: 10.5, rx: 2.4, 'stroke-width': 2 });
        add('path', { d: 'M8 10V7.5a4 4 0 0 1 8 0V10', 'stroke-width': 2 });
        add('circle', { cx: 9, cy: 15.4, r: 1.1, fill: true, danger: true });
        add('circle', { cx: 12, cy: 15.4, r: 1.1, fill: true, danger: true });
        add('circle', { cx: 15, cy: 15.4, r: 1.1, fill: true, danger: true });
      },
    },
    // A parcel with a warning triangle on its face.
    courier: {
      label: 'A parcel box carrying a warning triangle',
      draw: (add) => {
        add('path', { d: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z', 'stroke-width': 2 });
        add('path', { d: 'M3 7.5 12 12l9-4.5M12 12v9', 'stroke-width': 1.5 });
        add('path', { d: 'M12 13.4 15 19H9Z', 'stroke-width': 1.8, danger: true });
      },
    },
    // A briefcase with a play button: "watch videos and earn".
    task_job: {
      label: 'A work briefcase with a video play button',
      draw: (add) => {
        add('rect', { x: 2.5, y: 7, width: 19, height: 13, rx: 2.4, 'stroke-width': 2 });
        add('path', { d: 'M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7', 'stroke-width': 2 });
        add('path', { d: 'm10.6 10.8 4.4 2.7-4.4 2.7Z', 'stroke-width': 1.8, danger: true });
      },
    },
    // A gift box tied with a price tag — the prize that costs you money.
    reward_bill: {
      label: 'A prize gift box with a price tag attached',
      draw: (add) => {
        add('rect', { x: 3, y: 9.5, width: 18, height: 11, rx: 2, 'stroke-width': 2 });
        add('path', { d: 'M3 13.5h18M12 9.5V20.5', 'stroke-width': 1.6 });
        add('path', { d: 'M12 9.5C9.4 9.5 7 8.6 7 6.8S9 4 10.2 5c.9.8 1.8 2.6 1.8 4.5Zm0 0c2.6 0 5-.9 5-2.7S15 4 13.8 5c-.9.8-1.8 2.6-1.8 4.5Z', 'stroke-width': 1.7 });
        add('path', { d: 'm17.5 15.5 3.5 3.5-2.4 2.4-3.5-3.5Z', 'stroke-width': 1.7, danger: true });
      },
    },
    // A speech bubble whose voice wave is duplicated — a cloned voice.
    family_voice: {
      label: 'A speech bubble with a copied voice wave',
      draw: (add) => {
        add('path', { d: 'M3 5.5h18v11H8l-5 4Z', 'stroke-width': 2 });
        add('path', { d: 'M8 9v4M11 7.5v7M14 9.5v3', 'stroke-width': 2 });
        add('path', { d: 'M17.5 8.4v5.2', 'stroke-width': 2, danger: true });
      },
    },
    // A phone with a chain link: the loan app that will not let go.
    sextortion_loan: {
      label: 'A phone held by a chain — blackmail',
      draw: (add) => {
        add('rect', { x: 6, y: 2.5, width: 12, height: 19, rx: 2.6, 'stroke-width': 2 });
        add('path', { d: 'M10.5 5.3h3', 'stroke-width': 1.6 });
        add('path', { d: 'M9.6 13.4a2.4 2.4 0 0 1 0-3.4l1.2-1.2a2.4 2.4 0 0 1 3.4 3.4l-.5.5m-1 1-.5.5a2.4 2.4 0 1 1-3.4-3.4', 'stroke-width': 1.8, danger: true });
      },
    },
  };

  /**
   * @param {string} id one of the eight scam category ids
   * @param {number} [size]
   * @returns {SVGElement}
   */
  function scamIcon(id, size = 30) {
    const def = ICONS[id];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('class', 'scam-icon');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', def ? def.label : 'Scam');
    if (!def) return svg;

    const add = (tag, attrs) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'danger' || k === 'fill') continue;
        node.setAttribute(k, String(v));
      }
      node.setAttribute('fill', attrs.fill ? 'currentColor' : 'none');
      node.setAttribute('stroke', attrs.fill ? 'none' : 'currentColor');
      node.setAttribute('stroke-linecap', 'round');
      node.setAttribute('stroke-linejoin', 'round');
      if (attrs.danger) node.setAttribute('class', 'danger');
      svg.append(node);
    };
    def.draw(add);
    return svg;
  }

  window.scamIcon = scamIcon;
  window.SCAM_ICON_IDS = Object.keys(ICONS);
})();
