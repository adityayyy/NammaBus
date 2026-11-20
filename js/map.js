/* ============================================================
   NammaBus - map.js (Leaflet)
   Map setup with CARTO tiles, search, time-travel, follow banner.
   ============================================================ */
(function () {
  'use strict';

  const KARNATAKA_CENTER = [15.3173, 75.7139];
  const KARNATAKA_BOUNDS = L.latLngBounds([11.3, 73.5], [18.8, 79.0]);

  // ---------- Map ----------
  const map = L.map('map', {
    center: KARNATAKA_CENTER,
    zoom: 7,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: KARNATAKA_BOUNDS,
    maxBoundsViscosity: 0.8,
    zoomControl: false,
    fadeAnimation: true,
    markerZoomAnimation: true
  });

  // Zoom control bottom-right
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  // Single attribution control (bottom-right)
  L.control.attribution({ position: 'bottomright', prefix: '© OpenStreetMap contributors © CARTO' }).addTo(map);

  // ---------- Tile layers: created only after the CARTO key resolves ----------
  let darkTiles = null;
  let lightTiles = null;
  let darkMode = true;

  function setTheme(dark) {
    darkMode = dark;
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (!map || !darkTiles || !lightTiles) return;
    if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
    if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
    (dark ? darkTiles : lightTiles).addTo(map);
  }

  async function initTiles() {
    if (!window.Config) { console.error('Config module missing'); return; }
    let key;
    try { key = await window.Config.getCartoKey(); }
    catch (e) { return; }
    darkTiles = L.tileLayer(window.Config.tileUrl('dark'), { maxZoom: 20, attribution: '' });
    lightTiles = L.tileLayer(window.Config.tileUrl('light'), { maxZoom: 20, attribution: '' });
    var savedTheme = localStorage.getItem('theme') || 'dark';
    darkMode = (savedTheme === 'dark');
    document.body.setAttribute('data-theme', savedTheme);
    if (darkMode) { darkTiles.addTo(map); } else { lightTiles.addTo(map); }
    setTheme(darkMode);
  }
  initTiles();

  // expose map globally for buses.js
  window.map = map;
  window.L = L;
  window.setMapTheme = setTheme;

  // ---------- Fullscreen ----------
  const mapContainer = document.querySelector('.map-page') || document.getElementById('map').parentElement;
  const fsBtn = document.getElementById('fullscreenBtn');

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function enterFullscreen() {
    const el = mapContainer;
    let done = false;
    const fallback = function () {
      if (done) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) { done = true; return; }
      done = true;
      el.classList.add('css-fullscreen');
      onFsChange();
    };
    const p = (el.requestFullscreen && el.requestFullscreen()) ||
              (el.webkitRequestFullscreen && el.webkitRequestFullscreen());
    if (p && typeof p.then === 'function') {
      p.then(function () { done = true; onFsChange(); }).catch(fallback);
      setTimeout(fallback, 400);
    } else if (!el.requestFullscreen && !el.webkitRequestFullscreen) {
      el.classList.add('css-fullscreen');
      onFsChange();
    } else {
      setTimeout(fallback, 400);
    }
  }
  function exitFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const p = (document.exitFullscreen && document.exitFullscreen()) ||
                (document.webkitExitFullscreen && document.webkitExitFullscreen());
      if (p && typeof p.then === 'function') p.then(onFsChange).catch(onFsChange);
      else onFsChange();
    } else {
      mapContainer.classList.remove('css-fullscreen');
      onFsChange();
    }
  }
  function onFsChange() {
    setTimeout(function () { map.invalidateSize(); }, 100);
    updateFsIcon();
  }
  function updateFsIcon() {
    if (fsBtn) fsBtn.textContent = isFullscreen() || mapContainer.classList.contains('css-fullscreen') ? '✕' : '⛶';
  }
  if (fsBtn) {
    fsBtn.addEventListener('click', function () {
      if (isFullscreen() || mapContainer.classList.contains('css-fullscreen')) exitFullscreen();
      else enterFullscreen();
    });
  }
  if (fsBtn) fsBtn.addEventListener('click', function () { setTimeout(function(){ fsBtn.classList.toggle('active', isFullscreen() || mapContainer.classList.contains('css-fullscreen')); }, 450); });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isFullscreen() || mapContainer.classList.contains('css-fullscreen')) exitFullscreen();
    }
  });

  // ---------- Theme button ----------
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () { setTheme(!darkMode); themeBtn.classList.toggle('active', darkMode); });
  }
  if (themeBtn) themeBtn.classList.toggle('active', darkMode);

  // ---------- Recenter ----------
  const recenterBtn = document.getElementById('recenterBtn');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', function () {
      map.setView(KARNATAKA_CENTER, 7, { animate: true, duration: 1 });
      if (window.Buses) window.Buses.setFollow(false);
      const rc = document.getElementById('recenterBtn');
      if (rc) rc.classList.remove('needs-recenter');
    });
  }

  // ---------- Follow button ----------
  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    followBtn.addEventListener('click', function () {
      if (!window.Buses) return;
      const on = !window.Buses.getFollowMode();
      window.Buses.setFollow(on);
      followBtn.textContent = on ? '⏹' : '➤';
      followBtn.classList.toggle('active', on);
    });
  }

  // ---------- Manual drag/zoom pauses follow ----------
  map.on('dragstart zoomstart', function () {
    if (window.Buses && window.Buses.getFollowMode()) {
      window.Buses.pauseFollow();
      const rc = document.getElementById('recenterBtn');
      if (rc) rc.classList.add('needs-recenter');
    }
  });

  // ---------- City selects ----------
  const cities = [
    ['belagavi', 'Belagavi'], ['dharwad', 'Dharwad'], ['hubballi', 'Hubballi'],
    ['gadag', 'Gadag'], ['vijayapura', 'Vijayapura'], ['kalaburagi', 'Kalaburagi'],
    ['ballari', 'Ballari'], ['davangere', 'Davangere'], ['shivamogga', 'Shivamogga'],
    ['mysuru', 'Mysuru'], ['mangaluru', 'Mangaluru'], ['bengaluru', 'Bengaluru'],
    ['udupi', 'Udupi'], ['karwar', 'Karwar']
  ];
  const fromSel = document.getElementById('fromCity');
  const toSel = document.getElementById('toCity');
  cities.forEach(function (c) {
    const o1 = new Option(c[1], c[0]); fromSel.add(o1);
    const o2 = new Option(c[1], c[0]); toSel.add(o2);
  });
  fromSel.value = 'belagavi';
  toSel.value = 'bengaluru';

  const swapBtn = document.getElementById('swapCities');
  if (swapBtn) {
    swapBtn.addEventListener('click', function () {
      const t = fromSel.value; fromSel.value = toSel.value; toSel.value = t;
    });
  }

  // Date default today
  const dateInput = document.getElementById('travelDate');
  if (dateInput) {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    dateInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // ---------- Search ----------
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      const from = fromSel.value;
      const to = toSel.value;
      // highlight route on map: draw polyline from routes.json
      if (window.routesData && window.routesData[from + '-' + to]) {
        drawRoute(from + '-' + to, true);
      } else if (window.routesData && window.routesData[to + '-' + from]) {
        drawRoute(to + '-' + from, true);
      }
      // populate bus list with results
      const meta = document.getElementById('panelMeta');
      const routeKey = (window.routesData && window.routesData[from + '-' + to]) ? (from + '-' + to) : (to + '-' + from);
      if (meta) meta.textContent = routeKey.replace('-', ' → ') + ' · trips';
      const list = document.getElementById('busList');
      if (list) list.innerHTML = '';

      // direct buses
      const direct = (window.DB) ? window.DB.getTripsByRoute(from, to, null) : [];
      const directHeader = document.createElement('div');
      directHeader.style.cssText = 'font-weight:800;font-size:0.85rem;margin:4px 0;';
      directHeader.textContent = 'Direct buses (' + direct.length + ')';
      if (list) list.appendChild(directHeader);

      direct.forEach(function (trip) {
        const bus = trip.bus;
        const route = trip.route;
        const dist = route ? route.distance_km : 0;
        const fare = Math.round(dist * (bus ? bus.fare_per_km : 1) + 20);
        const item = document.createElement('div');
        item.className = 'bus-item';
        item.setAttribute('data-id', trip.id);
        item.innerHTML =
          '<div class="bus-item__top"><span class="bus-item__num">' + (bus ? bus.number : trip.id) + '</span>' +
          '<span class="badge badge--' + (bus ? bus.type.toLowerCase() : 'express') + '">' + (bus ? bus.type : '') + '</span>' +
          '<span class="bus-item__eta">' + trip.departure + '–' + trip.arrival + '</span></div>' +
          '<div class="bus-item__meta"><span>Seats: ' + (bus ? bus.total_seats : 0) + '</span>' +
          '<span>Fare: ₹' + fare + '</span><span>Est. fare, demo data</span></div>' +
          '<div class="bus-item__progress"><div class="bus-item__progress-bar" style="width:0%;background:' + TYPE_COLOR_ROUTE[bus.type.toLowerCase()] + '"></div></div>';
        item.onclick = function () {
          if (window.Buses) window.Buses.selectBus(trip.id);
        };
        item.querySelectorAll('button').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const tid = btn.getAttribute('data-trip');
            if (btn.getAttribute('data-action') === 'view') {
              if (window.Buses) window.Buses.selectBus(tid);
            } else {
              window.location.href = 'seats.html?trip=' + encodeURIComponent(tid);
            }
          });
        });
        if (list) list.appendChild(item);
      });

      // 1-change options
      if (window.DB) {
        const changes = window.DB.getTripsWithOneChange(from, to, null);
        if (changes.length) {
          const ch = document.createElement('div');
          ch.style.cssText = 'font-weight:800;font-size:0.85rem;margin:8px 0 4px;';
          ch.textContent = '1 change options (' + changes.length + ')';
          if (list) list.appendChild(ch);
          changes.forEach(function (c) {
            const item = document.createElement('div');
            item.className = 'bus-item';
            item.setAttribute('data-id', c.first.id);
            item.innerHTML =
              '<div class="bus-item__top"><span class="bus-item__num">' + c.first.id + ' + ' + c.second.id + '</span>' +
              '<span class="badge badge--express">1 change</span></div>' +
              '<div class="bus-item__meta"><span>Via ' + c.intermediate + '</span>' +
              '<span>' + c.first.departure + ' → ' + c.second.arrival + '</span></div>' +
              '<div style="display:flex;gap:6px;margin-top:4px;">' +
              '<button class="btn btn--sm btn--primary" data-action="seats" data-trip="' + c.first.id + '">Select seats</button></div>';
            item.onclick = function () {
              if (window.Buses) window.Buses.selectBus(c.first.id);
            };
            item.querySelectorAll('button').forEach(function (btn) {
              btn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.location.href = 'seats.html?trip=' + encodeURIComponent(btn.getAttribute('data-trip'));
              });
            });
            if (list) list.appendChild(item);
          });
        }
      }

      // draw route + fit bounds
      drawRoute(routeKey, true);
    });
  }

  // ---------- Route drawing ----------
  const routeLayers = {};
  const TYPE_COLOR_ROUTE = { ordinary: '#94A3B8', express: '#38BDF8', rajahamsa: '#34D399', airavat: '#F59E0B' };
  function activeFilterType() {
    const chip = document.querySelector('.chip[data-filter]');
    const f = chip ? chip.getAttribute('data-filter') : 'all';
    return (f && f !== 'all') ? f : null;
  }
  function drawRoute(key, selected) {
    // clear previous
    Object.keys(routeLayers).forEach(function (k) {
      if (routeLayers[k]) map.removeLayer(routeLayers[k]);
    });
    if (!window.routesData) return;
    Object.keys(window.routesData).forEach(function (k) {
      const r = window.routesData[k];
      const latlngs = r.coords.map(function (c) { return [c[0], c[1]]; });
      const isSelected = (k === key);
      const ft = activeFilterType();
      const color = isSelected ? (ft ? TYPE_COLOR_ROUTE[ft] : '#38BDF8') : '#94A3B8';
      const opacity = isSelected ? 1 : 0.15;
      const weight = isSelected ? 4 : 2;

      // dark casing underneath for selected route only
      if (isSelected) {
        const casing = L.polyline(latlngs, { color: '#000000', weight: weight + 4, opacity: 0.6 });
        casing.addTo(map);
        routeLayers[k + '_casing'] = casing;
      }

      const line = L.polyline(latlngs, {
        color: color,
        weight: weight,
        opacity: opacity,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-line' + (isSelected ? ' route-line--selected' : '')
      });
      line.addTo(map);
      routeLayers[k] = line;

      // Fit bounds to selected route with padding for left panel
      if (isSelected && selected) {
        const bounds = L.latLngBounds(latlngs);
        const panelWidth = document.querySelector('.left-stack')?.offsetWidth || 340;
        const paddingTopLeft = [80, panelWidth + 40];
        map.fitBounds(bounds, { paddingTopLeft: paddingTopLeft, maxZoom: 12, animate: true, duration: 1.2 });
      }
    });
  }

  // ---------- Filter chips ----------
  document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.chip[data-filter]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
      // re-draw with new filter
      const routeKey = new URLSearchParams(location.search).get('from') + '-' + new URLSearchParams(location.search).get('to');
      drawRoute(routeKey, true);
    });
  });

  // ---------- Side panel toggle ----------
  const panel = document.getElementById('sidePanel');
  const panelToggle = document.getElementById('panelToggle');
  if (panelToggle) {
    panelToggle.addEventListener('click', function () {
      panel.classList.toggle('collapsed');
      const expanded = !panel.classList.contains('collapsed');
      panelToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      panelToggle.textContent = expanded ? '‹' : '›';
      setTimeout(function () { map.invalidateSize(); }, 260);
    });
  }

  // Sidebar collapse/expand
  const leftStack = document.getElementById('leftStack');
  const collapseBtn = document.getElementById('collapseSidebarBtn');
  const expandBtn = document.getElementById('expandSidebarBtn');
  function setSidebarCollapsed(collapsed) {
    if (!leftStack) return;
    leftStack.classList.toggle('collapsed', collapsed);
    if (collapseBtn) collapseBtn.hidden = collapsed;
    if (expandBtn) expandBtn.hidden = !collapsed;
    setTimeout(function () { map.invalidateSize(); }, 280);
  }
  if (collapseBtn) collapseBtn.addEventListener('click', function () { setSidebarCollapsed(true); });
  if (expandBtn) expandBtn.addEventListener('click', function () { setSidebarCollapsed(false); });

  // ---------- Detail card close ----------
  const detailClose = document.getElementById('detailClose');
  if (detailClose) {
    detailClose.addEventListener('click', function () {
      document.getElementById('detailCard').hidden = true;
    });
  }

  // ---------- Clock + time travel ----------
  const clockEl = document.getElementById('liveClock');
  const timeSlider = document.getElementById('timeSlider');
  const speedBtns = document.querySelectorAll('.speed-btn');
  const timeModeLabel = document.getElementById('timeModeLabel');

  function updateTimeModeLabel() {
    if (timeModeLabel) {
      timeModeLabel.textContent = window.Sim && window.Sim.isSimulated() ? 'Simulated time' : 'Real time';
    }
  }

  function tickClock() {
    if (window.Sim) {
      const now = window.Sim.now();
      const d = new Date(now);
      const pad = function (n) { return String(n).padStart(2, '0'); };
      if (clockEl) clockEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    // update bus list ETAs
    if (window.Buses) {
      const st = window.Buses.getBusState();
      Object.keys(st).forEach(function (id) {
        const s = st[id];
        const etaEl = document.querySelector('[data-eta="' + id + '"]');
        if (etaEl) etaEl.textContent = (s.state === 'arrived') ? 'Arrived' : (s.state === 'scheduled' ? 'Dep ' + s.depTime : s.etaMin + ' min');
        const nextEl = document.querySelector('[data-next="' + id + '"]');
        if (nextEl) nextEl.textContent = 'Next: ' + (s.nextStop || '—');
        const seatsEl = document.querySelector('[data-seats="' + id + '"]');
        if (seatsEl) seatsEl.textContent = 'Seats: ' + s.seatsFree;
      });
    }
    setTimeout(tickClock, 1000);
  }

  const timeSliderLabel = document.getElementById('timeSliderLabel');
  function updateTimeSliderLabel() {
    if (!timeSliderLabel || !timeSlider) return;
    const min = parseInt(timeSlider.value, 10);
    const h = String(Math.floor(min / 60) % 24).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    timeSliderLabel.textContent = h + ':' + m;
  }
  if (timeSlider) {
    timeSlider.addEventListener('input', function () {
      const min = parseInt(timeSlider.value, 10);
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      base.setMinutes(min);
      if (window.Sim) {
        window.Sim.useSimulatedTime(base.getTime());
        updateTimeModeLabel();
      }
      updateTimeSliderLabel();
    });
    updateTimeSliderLabel();
  }

  speedBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = parseInt(btn.getAttribute('data-speed'), 10);
      if (window.Sim) window.Sim.setSpeed(s);
      speedBtns.forEach(function (b) { b.classList.remove('active'); });
      if (realTimeBtn) realTimeBtn.classList.remove('active');
      btn.classList.add('active');
    });
  });
  if (speedBtns.length) speedBtns[0].classList.add('active');

  // reset to real time button
  const realTimeBtn = document.getElementById('realTimeBtn');
  if (realTimeBtn) {
    realTimeBtn.addEventListener('click', function () {
      if (window.Sim) {
        window.Sim.useRealTime();
        window.Sim.setSpeed(1);
        updateTimeModeLabel();
        if (timeSlider) timeSlider.value = (new Date().getHours() * 60 + new Date().getMinutes());
        updateTimeSliderLabel();
      }
      speedBtns.forEach(function (b) { b.classList.remove('active'); });
      realTimeBtn.classList.add('active');
    });
  }
  if (realTimeBtn) realTimeBtn.classList.add('speed-btn');

  // ---------- Follow banner ----------
  const followBanner = document.getElementById('followBanner');
  const followBannerText = document.getElementById('followBannerText');
  const followProgress = document.getElementById('followProgress');

  function updateFollowBanner() {
    if (!followBanner) return;
    const on = window.Buses && window.Buses.getFollowMode();
    const id = window.Buses && window.Buses.getSelected();
    if (!on || !id) { followBanner.hidden = true; return; }
    followBanner.hidden = false;
    const st = window.Buses.getBusState()[id];
    if (!st) return;
    const mins = st.etaMin || 0;
    const km = Math.round((1 - st.progress) * 120);
    if (followBannerText) followBannerText.textContent = 'Next stop: ' + (st.nextStop || '—') + ', ' + mins + ' min, ' + km + ' km';
    if (followProgress) followProgress.style.width = Math.round(st.progress * 100) + '%';
  }
  setInterval(updateFollowBanner, 1000);

  // ---------- Status chip (replaces simulated badge) ----------
  function updateStatusChip() {
    const chip = document.querySelector('.status-chip');
    if (!chip) return;
    const sim = window.Sim && window.Sim.isSimulated();
    const now = window.Sim ? window.Sim.now() : Date.now();
    const lastUpdate = window.__lastSimUpdate || now;
    const diff = Math.round((now - lastUpdate) / 1000);
    if (sim) {
      chip.textContent = 'Simulated · ' + diff + 's ago';
      chip.className = 'status-chip status-chip--simulated';
    } else {
      chip.textContent = 'Online · ' + diff + 's ago';
      chip.className = 'status-chip status-chip--live';
    }
  }
  setInterval(updateStatusChip, 1000);

  // ---------- Init data + buses ----------
  // load routes.json into window.routesData
  fetch('data/routes.json').then(function (r) { return r.json(); }).then(function (json) {
    window.routesData = json;
    // seed trips durations
    const durations = {};
    Object.keys(json).forEach(function (k) { durations[k] = json[k].duration_min || 180; });
    if (window.Sim) window.Sim.seedTrips(durations);
    // init buses
    if (window.Buses) window.Buses.init();
    // If opened with ?trip= &follow=1, focus that trip's route and follow
    (function handleTrackParam() {
      const tp = new URLSearchParams(location.search).get('trip');
      const follow = new URLSearchParams(location.search).get('follow');
      if (!tp) return;
      let routeKey = null;
      if (window.DB) {
        const bk = window.DB.getBooking(tp);
        const tr = bk ? window.DB.getTrip(bk.trip_id) : window.DB.getTrip(tp);
        if (tr && tr.route_id) routeKey = tr.route_id;
      }
      if (routeKey) {
        const simTrips = (window.Sim && window.Sim.trips) ? window.Sim.trips : [];
        const match = simTrips.find(function (t) { return t.routeKey === routeKey; });
        if (match && window.Buses) {
          setTimeout(function () {
            window.Buses.selectBus(match.id);
            if (follow === '1') window.Buses.setFollow(true);
          }, 500);
        }
        drawRoute(routeKey, true);
      }
    })();
    // draw all routes muted initially
    if (!new URLSearchParams(location.search).get('trip')) drawRoute(null, false);
  }).catch(function (e) { console.error('routes load failed', e); });

  // expose drawRoute globally? keep local
  window.drawRoute = drawRoute;

  // ---------- Mobile bottom sheet drag ----------
  (function setupBottomSheet() {
    const ls = document.getElementById('leftStack');
    if (!ls) return;
    let startY = 0, startH = 0, dragging = false;
    ls.addEventListener('pointerdown', function (e) {
      if (window.innerWidth > 820) return;
      if (e.target.closest('button, input, select, .bus-item, .chip')) return;
      dragging = true;
      startY = e.clientY;
      startH = ls.offsetHeight;
      ls.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const delta = startY - e.clientY;
      const newH = Math.max(80, Math.min(window.innerHeight * 0.85, startH + delta));
      ls.style.maxHeight = newH + 'px';
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      const h = ls.offsetHeight;
      const vh = window.innerHeight;
      const snaps = [120, vh * 0.45, vh * 0.85];
      let nearest = snaps[0], best = Math.abs(h - snaps[0]);
      snaps.forEach(function (s) { if (Math.abs(h - s) < best) { best = Math.abs(h - s); nearest = s; } });
      ls.style.maxHeight = nearest + 'px';
    });
  })();

  // ---------- Active booking toast ----------
  function checkActiveBookingToast() {
    if (!window.DB) return;
    const bookings = window.DB.getBookings().filter(function (b) { return b.status === 'confirmed'; });
    if (!bookings.length) return;
    const b = bookings[bookings.length - 1];
    const trip = window.DB.getTrip(b.trip_id);
    if (!trip) return;
    const now = window.Sim ? window.Sim.now() : Date.now();
    const dep = new Date(trip.trip_date + 'T' + trip.departure).getTime();
    const arr = new Date(trip.trip_date + 'T' + trip.arrival).getTime();
    if (now < dep || now > arr) return;
    const progress = (now - dep) / (arr - dep);
    const stopsAway = Math.max(1, Math.round((1 - progress) * 4));
    if (stopsAway <= 3) {
      window.showToast('Your bus is ' + stopsAway + ' stop(s) away.', 'info');
    }
  }
  setInterval(checkActiveBookingToast, 30000);

  // ---------- Boot ----------
  function boot() {
    if (!window.Sim) { setTimeout(boot, 50); return; }
    updateTimeModeLabel();
    tickClock();
    if (timeSlider) timeSlider.value = (new Date().getHours() * 60 + new Date().getMinutes());
    updateTimeSliderLabel();
  }
  boot();

  // expose map globally for buses.js
  window.map = map;
  window.L = L;
  window.setMapTheme = setTheme;
})();