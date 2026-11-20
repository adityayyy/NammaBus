/* ============================================================
   NammaBus - theme.js
   Global light/dark theme toggle.
   ============================================================ */
(function () {
  'use strict';

  function getTheme() { return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'; }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body && document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
    // notify maps if present
    if (typeof window.setMapTheme === 'function') window.setMapTheme(theme === 'dark');
    if (typeof window.setMap3dTheme === 'function') window.setMap3dTheme(theme === 'dark');
  }

  // Apply early to avoid flash
  applyTheme(getTheme());

  function init() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
    btn.textContent = getTheme() === 'dark' ? 'LIGHT' : 'DARK';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();