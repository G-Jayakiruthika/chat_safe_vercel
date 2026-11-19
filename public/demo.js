'use strict';

(() => {
  const TYPES = [
    {
      kind: 'scam',
      n: 'Fake investment',
      d: 'Fraudsters promise 10x returns via "insider" crypto or stock groups, show fake profit dashboards, then block withdrawals.',
      msg: 'Join our VIP group: invest ₹10,000, get ₹1 lakh in 7 days. 100% guaranteed! Pay rajesh.trader@ybl',
      tip: 'Guaranteed returns do not exist. SEBI-registered brokers only use @valid UPI handles.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Digital arrest',
      d: 'Callers pose as CBI/police, claim you are linked to a crime, and keep you on video call demanding "bail" money.',
      msg: 'You are under DIGITAL ARREST. Do not disconnect this call. Transfer ₹2,00,000 to the RBI safe account.',
      tip: 'There is no such thing as digital arrest. Real police never arrest on video call. Hang up, call 1930.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'KYC / OTP',
      d: 'Fake bank messages push you to "update KYC" and then ask for the OTP that drains your account.',
      msg: 'Dear customer your KYC is pending. Click bit.ly/kyc-now and enter OTP.',
      tip: 'Never share an OTP — not even with the bank.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Courier parcel',
      d: 'A "courier" says your parcel has illegal items or needs a fee, then transfers you to fake officials.',
      msg: 'FedEx: Parcel held at customs with illegal items. Pay ₹3,450 clearance via UPI to release.',
      tip: 'Check tracking on the official courier app only.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Task job',
      d: 'Pay-per-like tasks pay tiny sums first, then require larger "deposits" to unlock bigger earnings.',
      msg: 'Earn ₹3,000/day. Like YouTube videos, then deposit ₹5,000 to unlock premium tasks.',
      tip: 'Real jobs never ask you to pay to work.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Lottery / bill',
      d: 'Fake prize winnings and urgent "electricity disconnection" notices create greed or fear.',
      msg: 'Your TNEB power will be cut tonight 9:30 PM. Call 98xxxxxx immediately to pay pending bill.',
      tip: 'Verify bills in your official utility app only.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Voice clone',
      d: 'AI clones a relative’s voice from social media clips and pleads for urgent money.',
      msg: '“Papa, I’ve had an accident. Please send ₹40,000 right now, don’t tell mom.”',
      tip: 'Agree on a family safe-word and call back on the saved number.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'scam',
      n: 'Loan / sextortion',
      d: 'Predatory loan apps steal contacts and harass; sextortion callers threaten to leak private videos.',
      msg: 'Pay back ₹28,000 now or we will send morphed photos to all your contacts.',
      tip: 'Do not pay. Screenshot, block, report on 1930.',
      footer: '1930 · cybercrime.gov.in',
    },
    {
      kind: 'civic',
      n: 'Urimai: Broken Water Pipe (Speed-Dial 9)',
      d: 'Rural elder presses 9 on keypad phone and speaks in Tamil/Hindi. Gemini classifies it as a CIVIC issue and activates Urimai.',
      msg: '“The panchayat water pipe on my street broke 3 days ago and no one is fixing it.”',
      tip: 'Urimai drafts a bilingual English + Tamil petition to the Municipal Water Board and sends the Action Kit to the son’s phone.',
      footer: 'O2O PDF · CM Helpline',
    },
    {
      kind: 'civic',
      n: 'Urimai: Remote Son Proxy & CM Bypass',
      d: 'If the son lives in another city, Urimai adapts: 1-click CM Helpline copy-paste OR Local Proxy WhatsApp link to a neighbor.',
      msg: '“Broken road near school bus stop in Ward 12. Are you in town? → Ask Local Proxy.”',
      tip: 'Neighbor snaps 1 photo via WhatsApp link; Urimai embeds it in the PDF or formats it for Mudhalvarin Mugavari / CPGRAMS.',
      footer: 'Digital-First · Local Proxy',
    },
  ];

  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = window.createBackground?.($('bg'), { reducedMotion });

  const list = $('demoSteps');
  list.innerHTML = TYPES.map((s, i) => `
    <li class="demo-scroll-step ${i === 0 ? 'active' : ''}" data-idx="${i}" tabindex="0" role="button" aria-label="Step ${i + 1}: ${s.n}">
      <span class="eyebrow">${String(i + 1).padStart(2, '0')} / ${String(TYPES.length).padStart(2, '0')} · ${s.kind === 'civic' ? 'URIMAI CIVIC' : 'KAVACH SCAM'}</span>
      <h2 style="margin:0;font-size:clamp(1.5rem,3.2vw,2.3rem)">${s.n}</h2>
      <p class="muted" style="font-size:1.08rem;max-width:46ch">${s.d}</p>
      <p style="font-weight:700;margin:0">💡 ${s.tip}</p>
    </li>
  `).join('');

  const stepEls = Array.from(document.querySelectorAll('.demo-scroll-step'));
  let current = -1;

  function show(i) {
    const idx = Math.max(0, Math.min(TYPES.length - 1, i));
    if (idx === current || !TYPES[idx]) return;
    current = idx;
    const t = TYPES[idx];
    stepEls.forEach((el, k) => el.classList.toggle('active', k === idx));
    $('dpSender').textContent = t.kind === 'civic' ? 'Speed-Dial 9 · Keypad Voice' : 'Unknown sender · now';
    $('dpCounter').textContent = `${String(idx + 1).padStart(2, '0')} / ${String(TYPES.length).padStart(2, '0')}`;
    $('dpMsg').textContent = t.msg;
    $('dpEngine').textContent = t.kind === 'civic' ? 'URIMAI CIVIC ENGINE' : 'KAVACH VERDICT';
    $('dpTitle').textContent = t.kind === 'civic' ? `⚖️ CIVIC · ${t.n}` : `⚠ SCAM · ${t.n}`;
    $('dpTip').textContent = t.tip;
    $('dpFooter').textContent = t.footer;
    $('dpPrevBtn').disabled = idx === 0;
    $('dpNextBtn').disabled = idx === TYPES.length - 1;
    const box = $('dpVerdictBox');
    box.className = `demo-verdict-box ${t.kind}`;
    $('dpTryLink').href = `app.html?prefill=${encodeURIComponent(t.msg)}`;
    bg?.setColor(t.kind === 'civic' ? [59, 130, 246] : [248, 113, 113], 0.45);
  }

  function goToStep(idx) {
    const targetIdx = Math.max(0, Math.min(TYPES.length - 1, idx));
    show(targetIdx);
    stepEls[targetIdx]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  // Deterministic center-of-viewport scroll tracking (never skips steps on PageDown/fast scroll)
  let ticking = false;
  function syncFromScroll() {
    ticking = false;
    const mid = window.innerHeight * 0.48;
    let bestIdx = 0;
    let bestDist = Infinity;
    stepEls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.top + r.height / 2) - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    show(bestIdx);
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(syncFromScroll);
    }
  }, { passive: true });

  // Keyboard navigation: PageDown / ArrowDown -> next step, PageUp / ArrowUp -> previous step
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      goToStep(current + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToStep(current - 1);
    }
  });

  stepEls.forEach((el, i) => {
    el.addEventListener('click', () => goToStep(i));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToStep(i);
      }
    });
  });

  $('dpPrevBtn').addEventListener('click', () => goToStep(current - 1));
  $('dpNextBtn').addEventListener('click', () => goToStep(current + 1));
  $('demoStartBtn').addEventListener('click', () => goToStep(0));

  show(0);

  $('themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    window.ChatSafeTheme?.set('mode', next);
  });
})();
