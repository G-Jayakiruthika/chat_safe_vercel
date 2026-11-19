'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = window.createBackground($('bg'), { reducedMotion });
  const isDark = () => document.documentElement.dataset.theme !== 'light';
  bg.setColor([34, 211, 238], isDark() ? 0.6 : 0.35);

  $('themeToggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('chatsafe.theme', next); } catch { /* ignore */ }
    bg.setColor([34, 211, 238], next === 'dark' ? 0.6 : 0.35);
  });

  const origin = location.origin + location.pathname.replace(/[^/]*$/, '');
  document.querySelectorAll('.hookUrl').forEach((el) => { el.textContent = `${origin}webhooks/meta`; });
  $('tgCmd').textContent =
    `curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \\\n  -d url=${origin}webhooks/telegram \\\n  -d secret_token=<TELEGRAM_WEBHOOK_SECRET>`;
  document.querySelectorAll('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($(b.dataset.copy).textContent);
        b.textContent = 'Copied ✔';
      } catch { /* clipboard blocked */ }
    }));


  /**
   * Channel badges. These are generic glyphs — a chat bubble, a paper plane, a camera
   * outline, a message bubble — drawn in each service's brand colour and labelled with
   * its name. They are deliberately not reproductions of the official logos.
   */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    'whatsapp-personal': { color: '#25D366', paths: ['M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z'], inner: 'M8.5 8.2c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5l.8 1.8c.1.3 0 .5-.1.7l-.5.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3 2.6c.3.1.5 0 .7-.2l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.6a2 2 0 0 1-2 1.8c-2.6 0-7.3-4.4-7.3-7.4 0-.7.1-1.1.1-1.3Z' },
    whatsapp: { color: '#25D366', paths: ['M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Z'], inner: 'M8.5 8.2c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5l.8 1.8c.1.3 0 .5-.1.7l-.5.6c-.2.2-.3.4-.1.7a7 7 0 0 0 3 2.6c.3.1.5 0 .7-.2l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.3.4.6a2 2 0 0 1-2 1.8c-2.6 0-7.3-4.4-7.3-7.4 0-.7.1-1.1.1-1.3Z' },
    telegram: { color: '#2AABEE', paths: ['M3 11.5 20 4.6a.7.7 0 0 1 1 .8l-2.7 13a.8.8 0 0 1-1.2.5l-4-2.9-2 1.9a.6.6 0 0 1-1-.4l-.3-3.6 7.6-6.9-9.3 5.6-3-1a.7.7 0 0 1 0-1.1Z'] },
    instagram: { color: '#E4405F', paths: ['M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Z'], inner: 'M12 7.6A4.4 4.4 0 1 0 12 16.4 4.4 4.4 0 0 0 12 7.6Zm0 2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Zm5.3-3.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z', outline: true },
    messenger: { color: '#0084FF', paths: ['M12 2.5c-5.3 0-9.5 3.9-9.5 9 0 2.8 1.3 5.3 3.4 7v4l3.2-1.8c.9.2 1.9.4 2.9.4 5.3 0 9.5-3.9 9.5-9s-4.2-9.6-9.5-9.6Z'], inner: 'M6.6 14.1 11 9.4l2.4 2.4 3.9-2.4-4.3 4.7-2.4-2.3-4 2.3Z' },
    share: { color: '#8b5cf6', paths: ['M12 2.5 7 7.5h3.2v7.2h3.6V7.5H17L12 2.5ZM4.5 13v6.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13h-2.2v6.3H6.7V13H4.5Z'] },
  };

  function channelIcon(id) {
    const def = ICONS[id] || ICONS.share;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ch-icon');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of def.paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      if (def.outline) {
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', def.color);
        path.setAttribute('stroke-width', '2');
      } else {
        path.setAttribute('fill', def.color);
      }
      svg.append(path);
    }
    if (def.inner) {
      const inner = document.createElementNS(SVG_NS, 'path');
      inner.setAttribute('d', def.inner);
      inner.setAttribute('fill', def.outline ? def.color : '#fff');
      svg.append(inner);
    }
    return svg;
  }

  /** Cards for every channel. `status` comes from /api/integrations (null in browser-only mode). */
  const CHANNELS = [
    {
      id: 'whatsapp-personal',
      name: 'WhatsApp (personal)',
      how: 'WhatsApp has no bot access for personal chats, so use your phone\'s share menu: long-press the message → Share → Chat_Safe (Android, after "Install app"). On iPhone, copy the message and paste it into Kavach.',
      action: { label: 'Open Kavach', href: 'app.html' },
      always: true,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      how: 'Forward the suspicious message to the Chat_Safe WhatsApp Business number. The reply comes back in the same chat.',
      linkLabel: 'Chat on WhatsApp',
    },
    { id: 'telegram', name: 'Telegram', how: 'Open the Chat_Safe bot, press Start, then forward any message.', linkLabel: 'Open bot' },
    { id: 'instagram', name: 'Instagram DM', how: 'Send the suspicious DM or a description to the Chat_Safe Instagram account.', linkLabel: 'Message on Instagram' },
    { id: 'messenger', name: 'Messenger', how: 'Message the Chat_Safe Facebook Page.', linkLabel: 'Open Messenger' },
    {
      id: 'share',
      name: 'Any app · Share sheet',
      how: 'Install Chat_Safe from the browser menu ("Install app" / "Add to Home screen"). Then share text from SMS, Gmail, Telegram or WhatsApp straight to Chat_Safe and it scans automatically.',
      action: { label: 'How to install', href: 'index.html#faq' },
      always: true,
    },
  ];

  function render(status) {
    const cards = CHANNELS.map((c, i) => {
      const s = status?.[c.id];
      const enabled = c.always || Boolean(s?.enabled);
      const card = document.createElement('article');
      card.className = `channel glass${enabled ? ' on' : ''}`;
      card.style.animationDelay = `${i * 70}ms`;
      const head = document.createElement('div');
      head.className = 'channel-head';
      const icon = document.createElement('span');
      icon.className = 'channel-icon';
      icon.append(channelIcon(c.id));
      const h = document.createElement('h2');
      h.textContent = c.name;
      const badge = document.createElement('span');
      badge.className = `badge ${enabled ? 'ok' : 'off'}`;
      badge.textContent = c.always ? 'Ready' : enabled ? 'Connected' : status === null ? 'Server only' : 'Not set up yet';
      head.append(icon, h, badge);
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = c.how;
      card.append(head, p);
      const href = c.action?.href || s?.link;
      if (href && enabled) {
        const a = document.createElement('a');
        a.className = 'button primary';
        a.href = href;
        if (/^https?:/.test(href)) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        a.textContent = c.action?.label || c.linkLabel;
        card.append(a);
      }
      return card;
    });
    $('channels').replaceChildren(...cards);
  }

  render(undefined);
  window.ChatSafeAPI.call('integrations')
    .then((status) => {
      if (status === null) {
        $('modeNote').hidden = false;
        $('modeNote').textContent = 'This is the browser-only version (GitHub Pages). Chat-app bots need the server version on Cloud Run.';
      }
      render(status);
    })
    .catch(() => render(null));
})();
