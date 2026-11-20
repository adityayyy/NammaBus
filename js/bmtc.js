/* ============================================================
   NammaBus - bmtc.js
   Live Bengaluru buses via the BMTC API proxy (/api/bmtc).
   Exposes the same window.Buses API as buses.js so map.js works.
   ============================================================ */
(function () {
  'use strict';

  const KARNATAKA_CENTER = [15.3173, 75.7139];
  const POLL_MS = 30000;          // poll live positions every 30s
  const STALE_MS = 10 * 60 * 1000; // ignore positions older than 10 min
  const BATCH_SIZE = 20;          // vehicles per concurrent batch
  const BATCH_DELAY_MS = 60;      // delay between batches
  const MAX_VEHICLES = 100;       // cap vehicles to keep API load reasonable

  const state = {};          // vehicleid -> bus
  let selected = null;
  let follow = false;
  let paused = false;
  let pollTimer = null;
  let allVehicleIds = [];    // all known vehicle IDs
  let filterText = '';

  const TYPE_COLOR = { AC: '#38BDF8', 'Non AC/Ordinary': '#94A3B8' };

  // ---- proxy helper ----
  async function api(endpoint, body) {
    const res = await fetch('/api/bmtc?endpoint=' + encodeURIComponent(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'lan': 'en' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error('BMTC ' + endpoint + ' -> ' + res.status);
    return res.json();
  }

  function parseStamp(s) {
    // "DD-MM-YYYY HH:MM:SS"
    if (!s || s.indexOf('-') < 0) return 0;
    const m = s.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return 0;
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  }

  // ---- marker: proper bus silhouette (side view) ----
  function busSvg(color, heading, number, withRotation) {
    const label = (number || '').replace(/[^A-Za-z0-9]/g, '').slice(-2).toUpperCase();
    const body =
      /* roof */
      '<path d="M9 13 Q9 9 13 9 L27 9 Q31 9 31 13 L31 27 L9 27 Z" fill="#0A0A0B" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      /* windshield */
      '<path d="M27 11 L30 13 L30 17 L27 17 Z" fill="' + color + '" opacity="0.85"/>' +
      /* windows */
      '<rect x="11" y="12" width="5" height="5" fill="' + color + '" opacity="0.75"/>' +
      '<rect x="18" y="12" width="5" height="5" fill="' + color + '" opacity="0.75"/>' +
      '<rect x="11" y="19" width="5" height="4" fill="' + color + '" opacity="0.35"/>' +
      '<rect x="18" y="19" width="5" height="4" fill="' + color + '" opacity="0.35"/>' +
      /* door */
      '<rect x="25" y="19" width="4" height="6" fill="' + color + '" opacity="0.5"/>' +
      /* wheels */
      '<circle cx="13" cy="27" r="3" fill="#0A0A0B" stroke="' + color + '" stroke-width="1.4"/>' +
      '<circle cx="27" cy="27" r="3" fill="#0A0A0B" stroke="' + color + '" stroke-width="1.4"/>' +
      /* headlight */
      '<rect x="30" y="22" width="2" height="2" fill="' + color + '"/>';
    const headingArrow = '<path d="M20 1 L16 7 L24 7 Z" fill="' + color + '"/>';
    const rot = withRotation ? ' transform="rotate(' + (heading || 0) + ',20,20)"' : '';
    const labelText = label ? '<text x="20" y="24" text-anchor="middle" font-family="monospace" font-size="7" font-weight="800" fill="#0A0A0B" stroke="#0A0A0B" stroke-width="2.6" paint-order="stroke">' + label + '</text>' +
      '<text x="20" y="24" text-anchor="middle" font-family="monospace" font-size="7" font-weight="800" fill="#F2F2F2">' + label + '</text>' : '';
    return '<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
      '<g' + rot + '>' + headingArrow + body + '</g>' + labelText + '</svg>';
  }

  function busIcon(color, heading, number) {
    return L.divIcon({ className: '', html: busSvg(color, heading, number, true), iconSize: [40, 40], iconAnchor: [20, 20] });
  }

  function addOrUpdate(v) {
    const lat = +v.lat || +v.latitude || +v.centerlat;
    const lng = +v.lng || +v.longitude || +v.centerlong;
    if (!lat || !lng) return;
    const id = String(v.id || v.vehicleid);
    const color = TYPE_COLOR[v.type || v.servicetype] || '#8A8F98';
    const num = v.num || v.vehiclenumber || '';
    let b = state[id];
    if (!b) {
      const marker = L.marker([lat, lng], { icon: busIcon(color, v.heading, num), zIndexOffset: 500 });
      marker.on('click', function (e) { e.originalEvent && e.originalEvent.stopPropagation(); selectBus(id); });
      marker.addTo(window.map);
      b = state[id] = { id: id, marker: marker, num: num, route: v.route || v.routeno || '', type: v.type || v.servicetype || '', color: color };
    }
    b.lat = lat; b.lng = lng;
    b.heading = +v.heading || 0;
    b.num = num || b.num;
    b.route = v.route || v.routeno || b.route;
    b.type = v.type || v.servicetype || b.type;
    b.color = TYPE_COLOR[b.type] || b.color;
    b.stop = v.stop || v.nextstop || v.currentstop || '';
    b.eta = v.eta || '';
    b.updated = (typeof v.updated === 'number') ? v.updated : parseStamp(v.lastrefreshon || v.lastupdatedat || '');
    b.marker.setLatLng([lat, lng]);
    b.marker.setIcon(busIcon(b.color, b.heading, b.num));
  }

  function clearStale() {
    const now = Date.now();
    Object.keys(state).forEach(function (id) {
      const b = state[id];
      if (b.updated && now - b.updated > STALE_MS) {
        window.map.removeLayer(b.marker);
        delete state[id];
        if (selected === id) selected = null;
      }
    });
  }

  // fetch live positions for a batch of vehicle IDs
  async function fetchBatch(vehicleIds) {
    const results = [];
    for (let i = 0; i < vehicleIds.length; i += BATCH_SIZE) {
      const batch = vehicleIds.slice(i, i + BATCH_SIZE);
      const promises = batch.map(function (vid) {
        return api('VehicleTripDetails_v2', { vehicleId: vid }).then(function (j) {
          const ll = (j.LiveLocation || [])[0];
          if (ll && ll.latitude && ll.longitude) {
            return {
              id: String(vid),
              lat: +ll.latitude,
              lng: +ll.longitude,
              num: ll.vehiclenumber || '',
              route: ll.routeno || '',
              type: ll.servicetype || 'BMTC',
              heading: +ll.heading || 0,
              updated: parseStamp(ll.lastrefreshon || ll.lastupdatedat || '')
            };
          }
          return null;
        }).catch(function () { return null; });
      });
      const batchResults = await Promise.all(promises);
      results.push.apply(results, batchResults.filter(Boolean));
      if (i + BATCH_SIZE < vehicleIds.length) {
        await new Promise(function (r) { setTimeout(r, BATCH_DELAY_MS); });
      }
    }
    return results;
  }

  // load all vehicles from ListVehicles then fetch live positions
  async function loadAllVehicles() {
    try {
      const j = await api('ListVehicles', { vehicleRegNo: 'KA', deviceType: 'WEB' });
      const ids = (j.data || []).map(function (d) { return d.vehicleid; }).slice(0, MAX_VEHICLES);
      allVehicleIds = ids;
      const found = await fetchBatch(ids);
      window.__bmtcDebug = { ids: ids.length, found: found.length, sample: found[0] || null };
      found.forEach(addOrUpdate);
      clearStale();
      renderBusList();
      sync3D();
    } catch (e) {
      console.error('BMTC load failed:', e);
    }
  }

  async function refresh() {
    if (!allVehicleIds.length) return;
    const found = await fetchBatch(allVehicleIds);
    found.forEach(addOrUpdate);
    clearStale();
    renderBusList();
    sync3D();
    if (follow && selected && state[selected]) {
      window.map.panTo([state[selected].lat, state[selected].lng], { animate: true, duration: 0.8 });
    }
  }

  // ---- route search ----
  async function findRoutes(text) {
    const j = await api('SearchRoute_v2', { routetext: text });
    return (j.data || []).slice(0, 6);
  }

  async function searchRoute(text) {
    filterText = text || '';
    renderBusList();
  }

  // ---- public API (matches buses.js) ----
  function selectBus(id) {
    selected = id;
    const b = state[id];
    if (!b) return;
    document.querySelectorAll('.bus-item').forEach(function (el) { el.classList.remove('active'); });
    const item = document.querySelector('.bus-item[data-id="' + id + '"]');
    if (item) item.classList.add('active');
    const dc = document.getElementById('detailCard');
    if (dc) {
      document.getElementById('detailTitle').textContent = (b.type || 'BMTC') + ' · ' + (b.num || id);
      document.getElementById('detailMeta').innerHTML =
        '<span>Route: ' + (b.route || '—') + '</span>' +
        '<span>Next stop: ' + (b.stop || '—') + '</span>' +
        '<span>Updated: ' + (b.updated ? new Date(b.updated).toLocaleTimeString() : '—') + '</span>';
      document.getElementById('detailTimeline').innerHTML = '';
      dc.hidden = false;
    }
    window.map.flyTo([b.lat, b.lng], 14, { duration: 1 });
  }

  function setFollow(on) {
    follow = on; paused = false;
    if (on && selected && state[selected]) {
      const b = state[selected];
      window.map.setView([b.lat, b.lng], 14, { animate: true, duration: 1 });
    }
  }
  function pauseFollow() { if (follow) paused = true; }

  function getBusState() {
    const out = {};
    Object.keys(state).forEach(function (id) {
      const b = state[id];
      out[id] = { state: 'live', nextStop: b.stop, etaMin: b.eta, seatsFree: '—', progress: 0, depTime: '—' };
    });
    return out;
  }

  function renderBusList() {
    const list = document.getElementById('busList');
    if (!list) return;
    const buses = Object.keys(state).map(function (k) { return state[k]; });
    const shown = filterText ? buses.filter(function (b) { return (b.route || '').toLowerCase().indexOf(filterText.toLowerCase()) >= 0 || (b.num || '').toLowerCase().indexOf(filterText.toLowerCase()) >= 0; }) : buses;
    if (!shown.length) {
      list.innerHTML = '<div class="empty-state">' + (filterText ? 'No live buses for this route.' : 'No live buses right now.') + '</div>';
      return;
    }
    list.innerHTML = shown.slice(0, 80).map(function (b) {
      const active = selected === b.id ? ' active' : '';
      return '<div class="bus-item' + active + '" data-id="' + b.id + '">' +
        '<div class="bus-item__top"><span class="bus-item__num">' + (b.num || b.id) + '</span>' +
        '<span class="badge badge--' + (b.type === 'AC' ? 'express' : 'ordinary') + '">' + (b.type || 'BMTC') + '</span>' +
        '<span class="bus-item__eta">' + (b.eta || 'LIVE') + '</span></div>' +
        '<div class="bus-item__meta"><span>' + (b.route || 'BMTC') + '</span><span>' + (b.stop || 'En route') + '</span></div></div>';
    }).join('');
    list.querySelectorAll('.bus-item').forEach(function (el) {
      el.addEventListener('click', function () { selectBus(el.getAttribute('data-id')); });
    });
  }

  window.Buses = {
    init: function () {
      if (!window.map || !window.L) { setTimeout(function () { window.Buses.init(); }, 100); return; }
      window.map.setView(KARNATAKA_CENTER, 7, { animate: false });
      loadAllVehicles();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(refresh, POLL_MS);
      if (window.map3d) setup3D();
      else window.addEventListener('map3d:ready', setup3D, { once: true });
    },
    search: searchRoute,
    selectBus: selectBus,
    setFollow: setFollow,
    getSelected: function () { return selected; },
    getFollowMode: function () { return follow; },
    getBusState: getBusState,
    pauseFollow: pauseFollow,
    renderBusList: renderBusList
  };

  // ---- 3D MapLibre layer ----
  function setup3D(attempt) {
    attempt = attempt || 0;
    const m = window.map3d;
    if (!m || typeof m.addSource !== 'function') {
      if (attempt < 30) setTimeout(function () { setup3D(attempt + 1); }, 500);
      return;
    }
    const addLayers = function () {
      if (!m.getSource || !m.addLayer) return;
      if (!m.getSource('bmtc-buses')) {
        m.addSource('bmtc-buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }
      // load bus images for both service types, then add symbol layer
      ['AC', 'Ordinary'].forEach(function (type) {
        const imgId = 'bmtc-bus-' + type;
        if (m.hasImage(imgId)) return;
        const color = type === 'AC' ? '#38BDF8' : '#94A3B8';
        const svg = busSvg(color, 0, '', false);
        const img = new Image(40, 40);
        img.onload = function () {
          try { if (!m.hasImage(imgId)) m.addImage(imgId, img, { pixelRatio: 2 }); } catch (e) {}
          if (!m.getLayer('bmtc-buses-symbols')) {
            // halo dots behind symbols for visibility
            m.addLayer({
              id: 'bmtc-buses-halo', type: 'circle', source: 'bmtc-buses',
              paint: {
                'circle-radius': 14,
                'circle-color': ['match', ['get', 'type'], 'AC', '#38BDF8', '#94A3B8'],
                'circle-opacity': 0.15,
                'circle-stroke-width': 1,
                'circle-stroke-color': ['match', ['get', 'type'], 'AC', '#38BDF8', '#94A3B8'],
                'circle-stroke-opacity': 0.5
              }
            });
            m.addLayer({
              id: 'bmtc-buses-symbols', type: 'symbol', source: 'bmtc-buses',
              layout: {
                'icon-image': ['match', ['get', 'type'], 'AC', 'bmtc-bus-AC', 'bmtc-bus-Ordinary'],
                'icon-size': 1.6,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              }
            });
            m.on('click', 'bmtc-buses-symbols', function (e) {
              if (e.features && e.features[0]) selectBus(e.features[0].properties.id);
            });
            m.on('mouseenter', 'bmtc-buses-symbols', function () { m.getCanvas().style.cursor = 'pointer'; });
            m.on('mouseleave', 'bmtc-buses-symbols', function () { m.getCanvas().style.cursor = ''; });
          }
          sync3D();
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
      if (m.getLayer('bmtc-buses-symbols')) sync3D();
    };
    const add = addLayers;
    try {
      if (typeof m.isStyleLoaded === 'function' && m.isStyleLoaded()) add();
      else if (typeof m.once === 'function') m.once('load', add);
      else if (typeof m.on === 'function') m.on('load', add);
      else if (attempt < 30) setTimeout(function () { setup3D(attempt + 1); }, 500);
    } catch (e) {
      if (attempt < 30) setTimeout(function () { setup3D(attempt + 1); }, 500);
    }
  }

  function sync3D() {
    const m = window.map3d;
    if (!m || !m.getSource) return;
    const src = m.getSource('bmtc-buses');
    if (!src) return;
    const features = Object.keys(state).map(function (id) {
      const b = state[id];
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
        properties: { id: id, num: b.num, route: b.route, type: b.type }
      };
    });
    src.setData({ type: 'FeatureCollection', features: features });
  }
})();
