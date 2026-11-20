/* ============================================================
   NammaBus - ui.js  (Phase 2B)
   Shared UI helpers: toasts.
   ============================================================ */

(function () {
  'use strict';

  // Toast container
  let container = null;
  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
    return container;
  }

  window.showToast = function (message, type) {
    const c = ensureContainer();
    const t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 14px;box-shadow:var(--shadow);color:var(--text);font-size:0.88rem;max-width:320px;animation:fadeIn .2s ease;';
    if (type === 'error') t.style.borderColor = 'var(--crowd-low)';
    t.textContent = message;
    c.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, 3500);
  };
})();
