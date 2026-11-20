/* ============================================================
   NammaBus - config.js
   Centralized CARTO key loading + tile URL helper.
   ============================================================ */
(function () {
  'use strict';

  let cachedKey = null;

  function showBanner() {
    if (document.getElementById('carto-key-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'carto-key-banner';
    banner.textContent = 'CARTO key missing: add it to .env (CARTO_KEY=...)';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;padding:12px 16px;font-weight:600;text-align:center;font-family:system-ui,sans-serif;';
    (document.body || document.documentElement).appendChild(banner);
  }

  const FALLBACK_KEY = 'cb1_5cvq_1_8011f64c37add97cd443f4c3';

  function parseEnv(text) {
    // Parse KEY=VALUE lines from .env format
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.indexOf('CARTO_KEY=') === 0) {
        return trimmed.slice('CARTO_KEY='.length).trim();
      }
    }
    return null;
  }

  async function tryFetch(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      const text = await res.text();
      const key = parseEnv(text);
      if (!key || key === 'YOUR_KEY' || key.indexOf('YOUR_KEY') !== -1) return null;
      return key;
    } catch (e) {
      return null;
    }
  }

  async function getCartoKey() {
    if (cachedKey) return cachedKey;
    // Try .env first, then fall back to carto-key.txt
    let key = await tryFetch('.env');
    if (!key) key = await tryFetch('./.env');
    if (!key) key = await tryFetch('/.env');
    if (!key) key = await tryFetch('carto-key.txt');
    if (!key) key = await tryFetch('./carto-key.txt');
    if (!key) key = await tryFetch('/carto-key.txt');
    if (key) { cachedKey = key; return key; }

    // If the page is opened directly via file://, fetch is blocked by the browser.
    // Fall back to the bundled key so the map still works instead of showing a
    // false "missing" banner.
    if (location.protocol === 'file:') {
      cachedKey = FALLBACK_KEY;
      return cachedKey;
    }

    showBanner();
    throw new Error('CARTO key missing: add CARTO_KEY=... to .env and serve the folder over HTTP (python -m http.server).');
  }

  function tileUrl(theme) {
    const key = cachedKey;
    if (!key) throw new Error('CARTO key not loaded; await getCartoKey() first.');
    if (theme === 'light') {
      return 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=' + encodeURIComponent(key);
    }
    if (theme === 'vector-dark' || theme === 'style-dark') {
      return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=' + encodeURIComponent(key);
    }
    if (theme === 'vector-light' || theme === 'style-light') {
      return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json?key=' + encodeURIComponent(key);
    }
    if (theme === 'vector' || theme === 'style') {
      return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=' + encodeURIComponent(key);
    }
    return 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=' + encodeURIComponent(key);
  }

  window.Config = { getCartoKey: getCartoKey, tileUrl: tileUrl };
})();
