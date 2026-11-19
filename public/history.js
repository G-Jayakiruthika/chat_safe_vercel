'use strict';

/**
 * "Case files": every conversation with Kavach is saved ON THIS DEVICE ONLY (localStorage),
 * can be searched with highlighted matches, grouped by date, reopened, exported or deleted.
 */
window.createHistory = function createHistory({ key = 'chatsafe.cases', max = 60 } = {}) {
  const LEVEL_RANK = { idle: 0, safe: 1, suspicious: 2, high: 3, critical: 4 };
  let cases = read();
  let currentId = null;

  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  function write() {
    try {
      localStorage.setItem(key, JSON.stringify(cases.slice(0, max)));
    } catch {
      /* storage full or blocked: keep in memory */
    }
  }
  const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return {
    /** Start a fresh conversation (saved once the first message arrives). */
    startNew() {
      currentId = null;
    },
    get currentId() {
      return currentId;
    },
    open(id) {
      currentId = cases.some((c) => c.id === id) ? id : null;
      return cases.find((c) => c.id === id) || null;
    },
    /**
     * @param {'you'|'kavach'} who
     * @param {string} text
     * @param {string} [mood]
     * @param {string} [lang]
     */
    add(who, text, mood = 'idle', lang = 'en') {
      const now = Date.now();
      let c = cases.find((x) => x.id === currentId);
      if (!c) {
        c = { id: newId(), title: who === 'you' ? text.slice(0, 70) : 'Conversation', created: now, updated: now, mood: 'idle', lang, messages: [] };
        cases.unshift(c);
        currentId = c.id;
      }
      c.messages.push({ who, text: text.slice(0, 4000), mood, t: now });
      if (c.title === 'Conversation' && who === 'you') c.title = text.slice(0, 70);
      if ((LEVEL_RANK[mood] || 0) > (LEVEL_RANK[c.mood] || 0)) c.mood = mood;
      c.updated = now;
      c.lang = lang;
      cases = [c, ...cases.filter((x) => x.id !== c.id)];
      write();
    },
    /**
     * Case-insensitive search across titles and messages.
     * @param {string} query
     * @returns {{case: any, snippet: string, match: [number, number]|null}[]}
     */
    search(query) {
      const q = String(query || '').trim().toLocaleLowerCase();
      return cases
        .map((c) => {
          if (!q) {
            const lastMsg = c.messages[c.messages.length - 1];
            return { case: c, snippet: lastMsg ? lastMsg.text.slice(0, 110) : '', match: null };
          }
          for (const text of [c.title, ...c.messages.map((m) => m.text)]) {
            const i = text.toLocaleLowerCase().indexOf(q);
            if (i >= 0) {
              const start = Math.max(0, i - 40);
              const snippet = (start > 0 ? '…' : '') + text.slice(start, i + q.length + 60);
              const off = i - start + (start > 0 ? 1 : 0);
              return { case: c, snippet, match: [off, off + q.length] };
            }
          }
          return null;
        })
        .filter(Boolean);
    },
    remove(id) {
      cases = cases.filter((c) => c.id !== id);
      if (currentId === id) currentId = null;
      write();
    },
    clear() {
      cases = [];
      currentId = null;
      write();
    },
    exportJson() {
      return JSON.stringify({ app: 'Chat_Safe', exported: new Date().toISOString(), cases }, null, 2);
    },
    get count() {
      return cases.length;
    },
  };
};

/** "Today", "Yesterday" or a date, for grouping. */
window.dayLabel = function dayLabel(ts, now = Date.now()) {
  const d = new Date(ts);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
