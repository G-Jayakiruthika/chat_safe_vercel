'use strict';

/**
 * One API for every page. Uses the Node.js server (with Gemini) when available;
 * otherwise — e.g. on GitHub Pages — loads core.js and runs the exact same
 * Kavach + Urimai + Radar engine in the browser.
 * All paths are relative so the site also works under a sub-path like /chat_safe_1/.
 */
window.ChatSafeAPI = (() => {
  let mode = null; // 'local'
  let local = null;
  let detecting = null;

  const OFFLINE_NOTICE = 'Network unstable. Reverting to Offline Rule Engine. Please verify manually.';

  function loadCore() {
    return new Promise((resolve, reject) => {
      if (window.ChatSafeCore) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = 'core.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load the offline engine'));
      document.head.append(s);
    }).then(() => {
      if (!local) local = window.ChatSafeCore.createEngine({ logger: { error() {} } });
    });
  }

  /**
   * Initializes the local browser engine (`core.js`) immediately without probing missing `/api/health` endpoints,
   * preventing spurious 404 console errors on Vercel serverless deployments.
   *
   * @returns {Promise<'local'>} Active local engine mode.
   */
  function detect() {
    if (mode) return Promise.resolve(mode);
    detecting =
      detecting ||
      (async () => {
        await loadCore();
        mode = 'local';
        return mode;
      })();
    return detecting;
  }

  async function runLocalHandler(path, body) {
    await loadCore();
    const handlers = {
      agent: local.agent,
      analyze: local.analyze,
      urimai: local.urimai,
      autopilot: local.autopilot,
      decoy: local.decoy,
      'upi-check': local.upiCheck,
      redact: local.redact,
      radar: local.radar,
      safebrowsing: local.safebrowsing,
      'reverse-geocode': async ({ lat, lng }) => ({
        address: `Lat ${Number(lat).toFixed(4)}, Lng ${Number(lng).toFixed(4)} (Local Municipal Ward)`,
        coords: { lat: Number(lat), lng: Number(lng) },
        source: 'offline-coords',
      }),
      portals: async () => local.portals(),
      languages: async () => local.languages(),
      integrations: async () => null,
    };
    const fn = handlers[path];
    if (!fn) throw new Error(`Unknown endpoint: ${path}`);
    return await fn(body || {});
  }

  /**
   * Executes a local engine domain call (`analyze`, `urimai`, `radar`, `languages`, etc.).
   *
   * @param {'agent'|'analyze'|'urimai'|'autopilot'|'decoy'|'upi-check'|'redact'|'radar'|'safebrowsing'|'reverse-geocode'|'portals'|'languages'|'integrations'} path
   * @param {object} [body] omit for GET
   * @returns {Promise<any>} Domain engine output.
   */
  async function call(path, body) {
    await detect();
    return await runLocalHandler(path, body);
  }

  return {
    call,
    detect,
    mode: () => mode,
    aiEnabled: () => false,
    OFFLINE_NOTICE,
  };
})();
