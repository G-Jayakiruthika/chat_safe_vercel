'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = window.createBackground($('bg'), { reducedMotion });
  const isDark = () => document.documentElement.dataset.theme !== 'light';
  const paint = () => bg.setColor([167, 139, 250], isDark() ? 0.55 : 0.3);
  paint();

  $('themeToggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('chatsafe.theme', next); } catch { /* ignore */ }
    paint();
  });

  let csrfMemory = '';
  function getCsrfToken() {
    for (const part of String(document.cookie || '').split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === 'cs_csrf') return decodeURIComponent(v.join('='));
    }
    return csrfMemory;
  }

  /** Calls `/api/auth/*` or `/api/privacy/*` with CSRF double-submit header. */
  async function call(endpoint, body, method = body ? 'POST' : 'GET') {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    const csrf = getCsrfToken();
    if (csrf && method !== 'GET') headers['X-CSRF-Token'] = csrf;
    const res = await fetch(`api/${endpoint}`, {
      method,
      headers,
      cache: 'no-store',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (data.csrfToken) csrfMemory = data.csrfToken;
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  function show(which) {
    for (const id of ['authCard', 'profileCard', 'noAccounts']) $(id).hidden = id !== which;
  }

  function renderProfile(user) {
    $('profName').textContent = user.name;
    $('statStreak').textContent = String(user.streak);
    $('statBest').textContent = String(user.best);
    $('statScans').textContent = String(user.scans);
    const types = window.SCAM_TYPES || [];
    $('statLearned').textContent = `${user.learned.length}/${types.length || 8}`;
    $('profLearned').replaceChildren(...types.map((t) => {
      const li = document.createElement('li');
      const got = user.learned.includes(t.id);
      li.className = got ? 'got' : '';
      const ico = document.createElement('span');
      ico.className = 'ico-sm';
      ico.append(window.scamIcon ? window.scamIcon(t.id, 22) : document.createTextNode(t.icon));
      const nm = document.createElement('span');
      nm.textContent = t.name;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = got ? '✅' : '⬜';
      li.append(ico, nm, mark);
      li.setAttribute('aria-label', `${t.name}: ${got ? 'learned' : 'not yet'}`);
      return li;
    }));
    show('profileCard');
  }

  /* ---------- Tabs ---------- */
  const tabs = [$('tab-signup'), $('tab-login')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t, n) => {
        t.setAttribute('aria-selected', String(n === i));
        t.tabIndex = n === i ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = n !== i;
      });
      $('authMsg').textContent = '';
    });
  });

  /* ---------- Forms ---------- */
  $('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msgEl = $('authMsg');
    if (!$('suConsent').checked || !$('suAgeConsent').checked) {
      msgEl.textContent = 'Please accept the Privacy Policy & Age Verification checkboxes.';
      msgEl.className = 'status error';
      return;
    }
    const raw = Object.fromEntries(new FormData(form));
    const payload = {
      name: raw.name,
      email: raw.email,
      city: raw.city || '',
      password: raw.password,
      website: raw.website || '',
      consent: $('suConsent').checked,
      ageConsent: $('suAgeConsent').checked,
      marketingOptIn: $('suAlerts').checked,
    };
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    msgEl.textContent = 'Creating Argon2id secured account…';
    msgEl.className = 'status';
    try {
      const { user } = await call('auth/signup', payload);
      form.reset();
      msgEl.textContent = '';
      renderProfile(user);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'status error';
    } finally {
      btn.disabled = false;
    }
  });

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msgEl = $('authMsg');
    const payload = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    msgEl.textContent = 'Signing in…';
    msgEl.className = 'status';
    try {
      const { user } = await call('auth/login', payload);
      form.reset();
      msgEl.textContent = '';
      try {
        const learned = (localStorage.getItem('chatsafe.learned') || '').split(',').filter(Boolean);
        const synced = await call('auth/progress', { learned, scanned: false }, 'PUT');
        renderProfile(synced.user);
        return;
      } catch { /* ignore sync fallback */ }
      renderProfile(user);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'status error';
    } finally {
      btn.disabled = false;
    }
  });

  $('resetReqForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(e.target));
      const res = await call('auth/request-reset', data);
      $('authMsg').textContent = res.message || 'Reset request submitted.';
      $('authMsg').className = 'status';
    } catch (err) {
      $('authMsg').textContent = err.message;
      $('authMsg').className = 'status error';
    }
  });

  $('resetConfirmForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(e.target));
      const res = await call('auth/reset-password', data);
      e.target.reset();
      $('authMsg').textContent = res.message || 'Password updated cleanly.';
      $('authMsg').className = 'status';
    } catch (err) {
      $('authMsg').textContent = err.message;
      $('authMsg').className = 'status error';
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    await call('auth/logout', {}).catch(() => {});
    show('authCard');
  });

  $('exportDataBtn')?.addEventListener('click', async () => {
    try {
      const data = await call('privacy/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'chatsafe-iso27701-export.json';
      a.click();
      $('profMsg').textContent = 'Portable JSON export downloaded.';
    } catch (err) {
      $('profMsg').textContent = err.message;
    }
  });

  $('unsubBtn')?.addEventListener('click', async () => {
    try {
      await call('privacy/unsubscribe', {});
      $('profMsg').textContent = 'Unsubscribed from all optional alert digests.';
    } catch (err) {
      $('profMsg').textContent = err.message;
    }
  });

  $('deleteAcctBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Permanently delete your account and erase all personal data? This cannot be undone.')) return;
    try {
      await call('auth/account', {}, 'DELETE');
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
      $('profMsg').textContent = '';
      show('authCard');
      $('authMsg').textContent = 'Account and personal data permanently erased.';
    } catch (err) {
      $('profMsg').textContent = err.message;
    }
  });

  /* ---------- Boot: detect backend accounts support & active session ---------- */
  (async () => {
    try {
      const healthRes = await fetch('api/health', { cache: 'no-store' });
      if (!healthRes.ok) return show('noAccounts');
      const health = await healthRes.json();
      if (!health.accounts) return show('noAccounts');
    } catch {
      return show('noAccounts');
    }

    try {
      const { user } = await call('auth/me');
      if (!user) return show('authCard');
      const learned = (() => {
        try { return (localStorage.getItem('chatsafe.learned') || '').split(',').filter(Boolean); } catch { return []; }
      })();
      try {
        const synced = await call('auth/progress', { learned, scanned: false }, 'PUT');
        return renderProfile(synced.user);
      } catch {
        return renderProfile(user);
      }
    } catch {
      return show('authCard');
    }
  })();
})();
