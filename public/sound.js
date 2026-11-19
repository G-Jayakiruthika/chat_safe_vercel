'use strict';

/** Tiny Web Audio sound kit (no audio files) + DTMF keypad dial tones for Speed-Dial '9'. */
window.ChatSafeSound = (() => {
  let ctx = null;
  let muted = false;
  const activeOscs = new Set();
  try {
    muted = localStorage.getItem('chatsafe.muted') === '1';
  } catch {
    /* ignore */
  }

  function ensureCtx() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', gain = 0.06) {
    if (muted) return;
    const c = ensureCtx();
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    activeOscs.add(osc);
    osc.onended = () => {
      activeOscs.delete(osc);
      try { g.disconnect(); } catch { /* ignore */ }
    };
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function stopAll() {
    for (const osc of [...activeOscs]) {
      try {
        osc.stop(0);
        osc.disconnect();
      } catch {
        /* already stopped */
      }
      activeOscs.delete(osc);
    }
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  const DTMF = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  };

  const play = {
    blip: () => tone(880, 0, 0.08),
    send: () => { tone(660, 0, 0.07); tone(990, 0.06, 0.08); },
    scan: () => { for (let i = 0; i < 5; i++) tone(400 + i * 120, i * 0.05, 0.06, 'triangle', 0.04); },
    safe: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.12); tone(1320, 0.2, 0.18); },
    civic: () => { tone(523, 0, 0.11); tone(659, 0.09, 0.11); tone(784, 0.18, 0.16); },
    alert: () => { for (let i = 0; i < 3; i++) { tone(880, i * 0.22, 0.12, 'square', 0.05); tone(587, i * 0.22 + 0.11, 0.1, 'square', 0.05); } },
    unlock: () => { tone(523, 0, 0.1); tone(659, 0.08, 0.1); tone(784, 0.16, 0.1); tone(1047, 0.24, 0.2); },
    ring: () => { tone(440, 0, 0.25, 'sine', 0.04); tone(480, 0, 0.25, 'sine', 0.04); },
  };

  return {
    play(name) {
      try {
        play[name]?.();
      } catch {
        /* audio not available */
      }
    },
    playDtmf(digit) {
      try {
        const pair = DTMF[String(digit)];
        if (!pair) return;
        tone(pair[0], 0, 0.14, 'sine', 0.05);
        tone(pair[1], 0, 0.14, 'sine', 0.05);
      } catch {
        /* ignore */
      }
    },
    toggle() {
      muted = !muted;
      if (muted) stopAll();
      try {
        localStorage.setItem('chatsafe.muted', muted ? '1' : '0');
      } catch {
        /* ignore */
      }
      return muted;
    },
    stopAll,
    get muted() {
      return muted;
    },
  };
})();
