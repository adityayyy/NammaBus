/* ============================================================
   NammaBus - map3d.js
   Minimal MapLibre GL 3D view using CARTO vector style.
   ============================================================ */
(function () {
  'use strict';

  var map = null;

  async function init() {
    if (!window.maplibregl) { console.error('MapLibre not loaded'); return; }
    if (!window.Config) { console.error('Config missing'); return; }
    var key = await window.Config.getCartoKey();
    var styleUrl = window.Config.tileUrl('vector-dark');
    map = new window.maplibregl.Map({
      container: 'map3d',
      style: styleUrl,
      center: [75.7139, 15.3173],
      zoom: 7,
      pitch: 60,
      bearing: -20
    });
    window.map3d = map;
    map.on('load', function () {
      window.dispatchEvent(new CustomEvent('map3d:ready', { detail: map }));
    });
  }

  window.setMap3dTheme = function (isDark) {
    if (!map || !window.Config) return;
    var styleUrl = window.Config.tileUrl(isDark ? 'vector-dark' : 'vector-light');
    map.setStyle(styleUrl);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();