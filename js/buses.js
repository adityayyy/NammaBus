/* ============================================================
   NammaBus - buses.js
   Cinematic bus markers, smooth interpolation, follow mode, clustering.
   Uses Sim (sim.js) for positions and liveFeed.js for optional GPS.
   ============================================================ */
(function () {
  'use strict';

  // State
  const busState = {}; // dbTripId -> { marker, pulse, trail, displayed:{lat,lng,heading}, target:{...}, lastUpdate, visible, simTrip, dbTrip }
  let routes = {};      // routes.json
  let allTrips = [];    // Sim.trips
  let selectedBusId = null;
  let followMode = false;
  let pausedFollow = false;
  let lastFullUpdate = 0;
  let lastZoom = null;
  const TRAIL_MAX = 50;

  // Mapping from DB trip ID to Sim trip ID
  const dbToSimTripMap = {};

  // Service colors (consistent with CSS tokens)
  const TYPE_CYCLE = ['Express', 'Ordinary', 'Rajahamsa', 'Airavat'];
  const TYPE_COLOR = { Ordinary: '#94A3B8', Express: '#38BDF8', Rajahamsa: '#34D399', Airavat: '#F59E0B' };

  function busTypeFor(trip) {
    let h = 0;
    for (let i = 0; i < trip.id.length; i++) h = (h * 31 + trip.id.charCodeAt(i)) >>> 0;
    return TYPE_CYCLE[h % TYPE_CYCLE.length];
  }

  function crowdColor(seatsFree) {
    if (seatsFree > 20) return '#34D399';
    if (seatsFree > 8) return '#F59E0B';
    return '#F87171';
  }

  // Shortest-turn angle interpolation
  function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return a + d * t;
  }

  // Clean SVG bus marker (rotatable)
  function makeBusIcon(type, crowd, heading) {
    const color = TYPE_COLOR[type] || '#94A3B8';
    const cc = crowdColor(crowd);
    const svg = `
      <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-${type}-${Math.random().toString(36).slice(2,7)}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g transform="rotate(${heading || 0}, 18, 18)">
          <!-- Bus body -->
          <rect x="6" y="11" width="24" height="14" rx="4" fill="${color}" stroke="${cc}" stroke-width="1.5"/>
          <!-- Windows -->
          <rect x="9" y="13" width="5" height="10" rx="1" fill="#0B1020" opacity="0.8"/>
          <rect x="16" y="13" width="5" height="10" rx="1" fill="#0B1020" opacity="0.8"/>
          <rect x="23" y="13" width="5" height="10" rx="1" fill="#0B1020" opacity="0.8"/>
          <!-- Wheels -->
          <circle cx="9" cy="27" r="3" fill="#111827"/>
          <circle cx="27" cy="27" r="3" fill="#111827"/>
          <!-- Heading arrow -->
          <polygon points="18,3 14,10 22,10" fill="${color}" opacity="0.9"/>
        </g>
      </svg>
    `;
    return L.divIcon({
      className: '',
      html: svg,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  }

  // Pulse ring SVG for marker
  function makePulseRing(color) {
    return L.divIcon({
      className: '',
      html: `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
          <animate attributeName="r" from="8" to="22" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      className: 'pulse-ring'
    });
  }

  function initMarkers() {
    if (!window.map || !window.L) return;
    allTrips = (window.Sim && window.Sim.trips) ? window.Sim.trips : [];

    // Build mapping from DB trip ID to Sim trip
    const dbTrips = window.DB ? window.DB.getTrips() : [];
    dbTrips.forEach(function (dbTrip) {
      const simTrip = allTrips.find(function (st) { return st.routeKey === dbTrip.route_id; });
      if (simTrip) {
        dbToSimTripMap[dbTrip.id] = simTrip.id;
      }
    });

    // Create markers for each DB trip, keyed by DB trip ID
    Object.keys(dbToSimTripMap).forEach(function (dbTripId) {
      const simTripId = dbToSimTripMap[dbTripId];
      const simTrip = allTrips.find(function (t) { return t.id === simTripId; });
      const dbTrip = window.DB.getTrip(dbTripId);
      if (!simTrip || !dbTrip) return;

      const type = busTypeFor(simTrip);
      const seatsFree = dbTrip.bus ? (window.DB.getBus(dbTrip.bus_id)?.total_seats || 40) : 40;
      const pos = window.Sim.positionFor(simTrip, window.Sim.now());
      const heading = 0;

      const icon = makeBusIcon(type, seatsFree, heading);
      const marker = L.marker([pos.lat, pos.lng], { icon: icon, zIndexOffset: 500 });
      marker.on('click', function (e) { e.originalEvent?.stopPropagation(); selectBus(dbTripId); });

      const pulse = L.marker([pos.lat, pos.lng], {
        icon: makePulseRing(TYPE_COLOR[type]),
        zIndexOffset: 400,
        interactive: false
      });

      const trail = L.polyline([], {
        color: TYPE_COLOR[type],
        weight: 3,
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-trail'
      });

      busState[dbTripId] = {
        trip: simTrip,
        dbTrip: dbTrip,
        type: type,
        seatsFree: seatsFree,
        marker: marker,
        pulse: pulse,
        trail: trail,
        displayed: { lat: pos.lat, lng: pos.lng, heading: 0 },
        target: { lat: pos.lat, lng: pos.lng, heading: 0 },
        heading: 0,
        lastFullUpdate: 0,
        inBounds: false
      };
      pulse.addTo(window.map);
    });
    renderVisible();
  }

  function renderVisible() {
    if (!window.map) return;
    const bounds = window.map.getBounds();
    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      const pos = st.target;
      const inBounds = bounds.contains([pos.lat, pos.lng]);
      if (inBounds && !st.inBounds) {
        st.marker.addTo(window.map);
        st.trail.addTo(window.map);
        st.inBounds = true;
      } else if (!inBounds && st.inBounds) {
        window.map.removeLayer(st.marker);
        window.map.removeLayer(st.pulse);
        window.map.removeLayer(st.trail);
        st.inBounds = false;
      }
    });
  }

  function updateTargets(now) {
    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      let pos = null;
      let isLive = false;
      if (window.LiveFeed && typeof window.LiveFeed.getLivePosition === 'function') {
        const lp = window.LiveFeed.getLivePosition(id);
        if (lp) { pos = lp; isLive = true; }
      }
      if (!pos) {
        pos = window.Sim.positionFor(st.trip, now);
      }
      st.isLive = isLive;
      st.state = pos.state;
      st.nextStop = pos.nextStop;
      st.etaMin = pos.etaMin;
      st.arrivesAt = pos.arrivesAt;
      st.depTime = pos.depTime;
      st.progress = pos.progress;

      // heading: compute from route polyline segment
      const route = routes[st.trip.routeKey];
      let heading = st.heading;
      if (route && route.coords && pos.state === 'running') {
        const coords = route.coords;
        const idx = Math.min(Math.floor(pos.progress * (coords.length - 1)), coords.length - 2);
        const a = coords[idx], b = coords[idx + 1];
        if (a && b) heading = window.Sim.headingBetween({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
      }
      st.target = { lat: pos.lat, lng: pos.lng, heading: heading };
      st.targetState = pos.state;
    });
  }

  // Animation loop
  let rafId = null;
  function loop(ts) {
    const now = window.Sim.now();
    const followed = selectedBusId && busState[selectedBusId];

    // Detect zoom changes
    let zoomChanged = false;
    if (window.map) {
      const z = window.map.getZoom();
      if (z !== lastZoom) { lastZoom = z; zoomChanged = true; }
    }

    // Update targets for followed bus every frame; others throttled
    if (ts - lastFullUpdate > 1500) {
      updateTargets(now);
      lastFullUpdate = ts;
    } else if (followed) {
      const st = followed;
      let pos = null;
      if (window.LiveFeed) pos = window.LiveFeed.getLivePosition(selectedBusId);
      if (!pos) pos = window.Sim.positionFor(st.trip, now);
      st.state = pos.state; st.nextStop = pos.nextStop; st.etaMin = pos.etaMin;
      st.arrivesAt = pos.arrivesAt; st.progress = pos.progress;
      const route = routes[st.trip.routeKey];
      if (route && route.coords && pos.state === 'running') {
        const coords = route.coords;
        const idx = Math.min(Math.floor(pos.progress * (coords.length - 1)), coords.length - 2);
        const a = coords[idx], b = coords[idx + 1];
        if (a && b) st.target.heading = window.Sim.headingBetween({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
      }
      st.target.lat = pos.lat; st.target.lng = pos.lng;
    }

    // Interpolate displayed positions
    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      const isFollowed = (id === selectedBusId);
      const t = isFollowed ? 0.3 : 0.15; // slightly faster for followed
      st.displayed.lat += (st.target.lat - st.displayed.lat) * t;
      st.displayed.lng += (st.target.lng - st.displayed.lng) * t;
      st.displayed.heading = lerpAngle(st.displayed.heading, st.target.heading, isFollowed ? 0.3 : 0.15);
      st.heading = st.displayed.heading;

      // update marker if in bounds
      if (st.inBounds && st.marker) {
        st.marker.setLatLng([st.displayed.lat, st.displayed.lng]);
        const el = st.marker.getElement();
        if (el) {
          const g = el.querySelector('g');
          if (g) g.style.transform = 'rotate(' + st.displayed.heading + 'deg)';
        }
        // pulse follows bus
        if (st.pulse) st.pulse.setLatLng([st.displayed.lat, st.displayed.lng]);

        // trail for followed
        if (id === selectedBusId && followMode) {
          st.trail.addLatLng([st.displayed.lat, st.displayed.lng]);
          const pts = st.trail.getLatLngs();
          if (pts.length > TRAIL_MAX) st.trail.setLatLngs(pts.slice(pts.length - TRAIL_MAX));
        }
      }
    });

    // Follow mode pan - smooth camera tracking
    if (followMode && !pausedFollow && followed) {
      if (window.map) {
        window.map.panTo([followed.displayed.lat, followed.displayed.lng], { animate: true, duration: 0.8, easeLinearity: 0.25 });
      }
    }

    renderVisible();
    if (zoomChanged && window.map) {
      updateMarkerSize();
      showCityLabels(window.map.getZoom() >= 8);
      buildClusters();
    }
    rafId = requestAnimationFrame(loop);
  }

  function selectBus(id) {
    selectedBusId = id;
    document.querySelectorAll('.bus-item').forEach(function (el) { el.classList.remove('active'); });
    const item = document.querySelector('.bus-item[data-id="' + id + '"]');
    if (item) item.classList.add('active');

    const st = busState[id];
    if (!st) return;
    const simTrip = st.trip;
    const dbTrip = st.dbTrip;
    const type = st.type;

    // Update detail card with rich info
    document.getElementById('detailTitle').textContent = type + ' · ' + dbTrip.id;
    document.getElementById('detailMeta').innerHTML =
      '<span>Route: ' + simTrip.routeKey.replace('-', ' → ') + '</span>' +
      '<span>Type: ' + type + '</span>' +
      '<span>Seats free: ' + st.seatsFree + '</span>' +
      '<span>Departs: ' + st.depTime + '</span>' +
      '<span>Arrives: ' + st.arrivesAt + '</span>' +
      '<span>Speed: ~' + Math.round(st.progress * 80 + 40) + ' km/h</span>';

    // Timeline with progress
    const tl = document.getElementById('detailTimeline');
    tl.innerHTML = '';
    simTrip.stops.forEach(function (s, idx) {
      const div = document.createElement('div');
      div.className = 'tl-stop';
      const tFrac = st.progress;
      const stopFrac = s.frac;
      if (stopFrac < tFrac - 0.02) div.classList.add('done');
      else if (Math.abs(stopFrac - tFrac) < 0.05) div.classList.add('current');
      div.innerHTML = '<span class="tl-dot"></span><span>' + s.name + '</span><span class="tl-time">' + s.arriveMin + ' min</span>';
      tl.appendChild(div);
    });

    const dc = document.getElementById('detailCard');
    dc.hidden = false;

    // Book seats button - use DB trip ID
    const btn = document.getElementById('bookSeatsBtn');
    btn.onclick = function () {
      window.location.href = 'seats.html?trip=' + encodeURIComponent(dbTrip.id);
    };

    // Follow button
    const fb = document.getElementById('followToggleBtn');
    if (fb) {
      fb.onclick = function () { setFollow(!followMode); };
      fb.textContent = followMode ? 'Stop follow' : 'Follow';
    }
  }

  function setFollow(on) {
    followMode = on;
    pausedFollow = false;
    const fb = document.getElementById('followToggleBtn');
    if (fb) fb.textContent = on ? 'Stop follow' : 'Follow';
    if (on && selectedBusId) {
      const st = busState[selectedBusId];
      if (st && window.map) {
        window.map.setView([st.displayed.lat, st.displayed.lng], 12, { animate: true, duration: 1 });
        st.trail.setLatLngs([]);
      }
    }
    const rc = document.getElementById('recenterBtn');
  }

  function pauseFollow() {
    if (followMode) {
      pausedFollow = true;
      const rc = document.getElementById('recenterBtn');
      if (rc) rc.classList.add('needs-recenter');
    }
  }

  // ---------- Bus list rendering with progress bars ----------
  function renderBusList(routeKey) {
    const list = document.getElementById('busList');
    if (!list) return;
    list.innerHTML = '';
    const st = busState;
    // Get DB trips for this route
    let dbTrips = window.DB ? window.DB.getTrips() : [];
    if (routeKey) {
      dbTrips = dbTrips.filter(function (t) { return t.route_id === routeKey; });
    }
    const now = window.Sim ? window.Sim.now() : Date.now();
    dbTrips.sort(function (a, b) {
      const simTripA = dbToSimTripMap[a.id] ? allTrips.find(t => t.id === dbToSimTripMap[a.id]) : null;
      const simTripB = dbToSimTripMap[b.id] ? allTrips.find(t => t.id === dbToSimTripMap[b.id]) : null;
      if (!simTripA || !simTripB) return 0;
      const pa = window.Sim.positionFor(simTripA, now);
      const pb = window.Sim.positionFor(simTripB, now);
      const ea = pa.state === 'scheduled' ? pa.etaMin : (pa.state === 'running' ? 0 : 9999);
      const eb = pb.state === 'scheduled' ? pb.etaMin : (pb.state === 'running' ? 0 : 9999);
      return ea - eb;
    });

    if (dbTrips.length === 0) {
      const es = document.createElement('div');
      es.className = 'empty-state';
      es.textContent = 'No buses match this filter.';
      list.appendChild(es);
      return;
    }

    dbTrips.slice(0, 40).forEach(function (dbTrip) {
      const s = st[dbTrip.id];
      if (!s) return;
      const type = s.type;
      const color = TYPE_COLOR[type];
      const simTripId = dbToSimTripMap[dbTrip.id];
      const simTrip = allTrips.find(t => t.id === simTripId);
      if (!simTrip) return;
      const pos = window.Sim.positionFor(simTrip, now);
      const etaText = pos.state === 'arrived' ? 'Arrived' : (pos.state === 'scheduled' ? 'Dep ' + pos.depTime : pos.etaMin + ' min');
      const progressPct = Math.round(pos.progress * 100);
      const item = document.createElement('div');
      item.className = 'bus-item';
      item.setAttribute('data-id', dbTrip.id);
      item.innerHTML =
        '<div class="bus-item__top"><span class="bus-item__num">' + dbTrip.id + '</span>' +
        '<span class="badge badge--' + type.toLowerCase() + '">' + type + '</span>' +
        '<span class="bus-item__eta">' + etaText + '</span></div>' +
        '<div class="bus-item__meta"><span class="crowd-dot" style="background:' + crowdColor(s.seatsFree) + '"></span>' +
        '<span>' + dbTrip.route_id.replace('-', ' → ') + '</span><span>Seats: ' + s.seatsFree + '</span></div>' +
        '<div class="bus-item__progress"><div class="bus-item__progress-bar" style="width:' + progressPct + '%;background:' + color + '"></div></div>';
      item.onclick = function () {
        if (window.Buses) window.Buses.selectBus(dbTrip.id);
        if (s && s.displayed && window.map) window.map.flyTo([s.displayed.lat, st.displayed.lng], 12, { duration: 1 });
      };
      list.appendChild(item);
    });
  }

  // ---------- Zoom-based features: marker size, clustering, city labels ----------
  const cityMarkers = [];
  const clusterMarkers = [];

  function cityList() {
    return [
      { name: 'Belagavi', lat: 15.8497, lng: 74.4977 },
      { name: 'Hubballi', lat: 15.3647, lng: 75.1240 },
      { name: 'Dharwad', lat: 15.4589, lng: 75.0078 },
      { name: 'Vijayapura', lat: 16.8302, lng: 75.7100 },
      { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
      { name: 'Mysuru', lat: 12.2958, lng: 76.6394 },
      { name: 'Mangaluru', lat: 12.9141, lng: 74.8560 },
      { name: 'Ballari', lat: 15.1394, lng: 76.9214 },
      { name: 'Davangere', lat: 14.4644, lng: 75.9218 },
      { name: 'Shivamogga', lat: 13.9299, lng: 75.5681 },
      { name: 'Udupi', lat: 13.3409, lng: 74.7421 },
      { name: 'Karwar', lat: 14.8131, lng: 74.1297 },
      { name: 'Kalaburagi', lat: 17.3297, lng: 76.8343 },
      { name: 'Gadag', lat: 15.4256, lng: 75.6270 }
    ];
  }

  function addCityLabels() {
    if (!window.map) return;
    cityList().forEach(function (c) {
      const m = L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: 'city-label-marker', html: c.name, iconSize: [0, 0] }),
        interactive: false,
        zIndexOffset: 100
      });
      cityMarkers.push(m);
    });
  }

  function showCityLabels(show) {
    if (!window.map) return;
    cityMarkers.forEach(function (m) {
      if (show) { if (!window.map.hasLayer(m)) m.addTo(window.map); }
      else { if (window.map.hasLayer(m)) window.map.removeLayer(m); }
    });
  }

  function updateMarkerSize() {
    if (!window.map) return;
    const zoom = window.map.getZoom();
    const large = zoom > 7;
    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      if (!st.marker) return;
      const el = st.marker.getElement();
      if (!el) return;
      const svg = el.querySelector('svg');
      if (svg) svg.style.width = (large ? '44px' : '36px');
    });
  }

  function buildClusters() {
    // Remove existing clusters
    clusterMarkers.forEach(function (m) { if (window.map.hasLayer(m)) window.map.removeLayer(m); });
    clusterMarkers.length = 0;

    const zoom = window.map.getZoom();
    if (zoom > 7) {
      // Show individual markers above zoom 7
      Object.keys(busState).forEach(function (id) {
        const st = busState[id];
        if (st.inBounds && !window.map.hasLayer(st.marker)) st.marker.addTo(window.map);
        if (st.pulse && !window.map.hasLayer(st.pulse)) st.pulse.addTo(window.map);
      });
      return;
    }

    // Hide individual markers at zoom <= 7
    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      if (window.map.hasLayer(st.marker)) window.map.removeLayer(st.marker);
      if (st.pulse && window.map.hasLayer(st.pulse)) window.map.removeLayer(st.pulse);
    });

    // Grid clustering for buses NOT on selected route
    const selectedRoute = selectedBusId ? busState[selectedBusId]?.trip?.routeKey : null;
    const cellSize = 50;
    const map = window.map;
    const clusters = {};

    Object.keys(busState).forEach(function (id) {
      const st = busState[id];
      if (!st.inBounds) return;
      // Don't cluster buses on the selected route - show them individually
      if (selectedRoute && st.trip.routeKey === selectedRoute) return;

      const pt = map.latLngToContainerPoint([st.displayed.lat, st.displayed.lng]);
      const cx = Math.floor(pt.x / cellSize);
      const cy = Math.floor(pt.y / cellSize);
      const key = cx + ',' + cy;
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push({ id: id, st: st, pt: pt });
    });

    Object.keys(clusters).forEach(function (key) {
      const group = clusters[key];
      if (group.length <= 1) {
        const st = group[0].st;
        if (!map.hasLayer(st.marker)) st.marker.addTo(map);
        if (st.pulse && !map.hasLayer(st.pulse)) st.pulse.addTo(map);
        return;
      }
      const lat = group.reduce(function (s, g) { return s + g.st.displayed.lat; }, 0) / group.length;
      const lng = group.reduce(function (s, g) { return s + g.st.displayed.lng; }, 0) / group.length;
      const bubble = L.marker([lat, lng], {
        icon: L.divIcon({ className: 'cluster-bubble', html: String(group.length), iconSize: [36, 36], iconAnchor: [18, 18] }),
        zIndexOffset: 600
      });
      bubble.on('click', function () { map.setView([lat, lng], Math.min(zoom + 2, 12)); });
      bubble.addTo(map);
      clusterMarkers.push(bubble);
    });
  }

  function updateZoomFeatures() {
    if (!window.map) return;
    const zoom = window.map.getZoom();
    updateMarkerSize();
    showCityLabels(zoom >= 8);
    buildClusters();
  }

  // Hook into map zoom (only when a real Leaflet map exists; map.js sets it later)
  if (window.map && typeof window.map.on === 'function') {
    addCityLabels();
    window.map.on('zoomend', updateZoomFeatures);
    setTimeout(function () { updateZoomFeatures(); }, 0);
  }

  // Public API
  window.Buses = {
    init: function () {
      var start = function (json) {
        routes = json;
        window.routesData = json;
        var durations = {};
        Object.keys(json).forEach(function (k) {
          durations[k] = json[k].duration_min || 180;
        });
        if (window.Sim) window.Sim.seedTrips(durations);
        initMarkers();
        updateTargets(window.Sim.now());
        if (window.map && typeof window.map.on === 'function') { window.map.on('zoomend', updateZoomFeatures); } else { console.warn('window.map is not a valid Leaflet map, skipping zoomend handler'); }
        renderBusList();
        if (!rafId) rafId = requestAnimationFrame(loop);
      };
      if (window.routesData) { start(window.routesData); return; }
      fetch('data/routes.json').then(function (r) { return r.json(); }).then(start).catch(function (e) {
        console.error('Failed to load routes.json', e);
      });
    },
    selectBus: selectBus,
    setFollow: setFollow,
    getSelected: function () { return selectedBusId; },
    getFollowMode: function () { return followMode; },
    getBusState: function () { return busState; },
    pauseFollow: pauseFollow,
    renderBusList: renderBusList
  };

  // Expose for map.js drag detection
  window.addEventListener('bus:pauseFollow', pauseFollow);
})();