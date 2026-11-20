/* ============================================================
   NammaBus - sim.js (Phase 1.6)
   Clock-based "real-time" simulation.

   POSITIONS ARE NOT FROM GPS. Every bus position is computed
   from the current (real or simulated) clock + the trip's
   timetable + the route polyline. See liveFeed.js for the
   optional real-GPS hook.

   This file exposes a global `Sim` object used by buses.js.
   ============================================================ */

(function () {
  'use strict';

  // City coordinates (lat, lng) - used as stop positions
  const CITY = {
    belagavi:   { lat: 15.8497, lng: 74.4977, name: 'Belagavi' },
    dharwad:    { lat: 15.4589, lng: 75.0078, name: 'Dharwad' },
    hubballi:   { lat: 15.3647, lng: 75.1240, name: 'Hubballi' },
    vijayapura: { lat: 16.8302, lng: 75.7100, name: 'Vijayapura' },
    bengaluru:  { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
    mysuru:     { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
    mangaluru:  { lat: 12.9141, lng: 74.8560, name: 'Mangaluru' },
    ballari:    { lat: 15.1394, lng: 76.9214, name: 'Ballari' },
    davangere:  { lat: 14.4644, lng: 75.9218, name: 'Davangere' }
  };

  // Stop plan per route: list of city keys along the route, with
  // a fractional position (0..1) along the polyline for each stop.
  const STOP_PLANS = {
    'belagavi-hubballi':    [{ k: 'belagavi', f: 0 }, { k: 'dharwad', f: 0.55 }, { k: 'hubballi', f: 1 }],
    'belagavi-dharwad':     [{ k: 'belagavi', f: 0 }, { k: 'dharwad', f: 1 }],
    'belagavi-bengaluru':   [{ k: 'belagavi', f: 0 }, { k: 'hubballi', f: 0.22 }, { k: 'davangere', f: 0.55 }, { k: 'bengaluru', f: 1 }],
    'hubballi-bengaluru':   [{ k: 'hubballi', f: 0 }, { k: 'davangere', f: 0.45 }, { k: 'bengaluru', f: 1 }],
    'bengaluru-mysuru':     [{ k: 'bengaluru', f: 0 }, { k: 'mysuru', f: 1 }],
    'bengaluru-mangaluru':  [{ k: 'bengaluru', f: 0 }, { k: 'mangaluru', f: 1 }],
    'belagavi-vijayapura':  [{ k: 'belagavi', f: 0 }, { k: 'vijayapura', f: 1 }],
    'bengaluru-ballari':    [{ k: 'bengaluru', f: 0 }, { k: 'ballari', f: 1 }]
  };

  const DWELL_MIN = 4; // minutes at each intermediate stop

  // Trip store: { id, routeKey, depMin (minutes from midnight), durMin, stops:[{name,lat,lng,frac,arriveMin,departMin}] }
  const trips = [];

  function buildStops(routeKey, durMin) {
    const plan = STOP_PLANS[routeKey] || [];
    const stops = plan.map(function (s) {
      return { name: CITY[s.k].name, lat: CITY[s.k].lat, lng: CITY[s.k].lng, frac: s.f };
    });
    // assign arrive/depart minutes
    let cumDwell = 0;
    stops.forEach(function (st, idx) {
      const base = st.frac * durMin;
      st.arriveMin = base + (idx === 0 ? 0 : cumDwell);
      const isLast = idx === stops.length - 1;
      const dwell = (idx === 0 || isLast) ? 0 : DWELL_MIN;
      st.departMin = st.arriveMin + dwell;
      cumDwell += dwell;
    });
    // scale so last arrives exactly at durMin
    const lastArrive = stops[stops.length - 1].arriveMin;
    const scale = durMin / Math.max(lastArrive, 1);
    stops.forEach(function (st) {
      st.arriveMin = Math.round(st.arriveMin * scale);
      st.departMin = Math.round(st.departMin * scale);
    });
    return stops;
  }

  // Seed trips: several per route across the day, including overnight
  function seedTrips(routeDurations) {
    trips.length = 0;
    const routeKeys = Object.keys(STOP_PLANS);
    let idCounter = 1;
    routeKeys.forEach(function (rk) {
      const durMin = (routeDurations && routeDurations[rk]) || 180;
      // departures every 90 min from 00:00 to 23:30, plus a couple overnight
      for (let dep = 0; dep < 24 * 60; dep += 90) {
        trips.push({
          id: 'T' + (idCounter++),
          routeKey: rk,
          depMin: dep,
          durMin: durMin,
          stops: buildStops(rk, durMin)
        });
      }
      // overnight services
      [60, 120].forEach(function (dep) {
        trips.push({
          id: 'T' + (idCounter++),
          routeKey: rk,
          depMin: dep, // just after midnight
          durMin: durMin,
          stops: buildStops(rk, durMin)
        });
      });
    });
  }

  // ---------- Clock ----------
  let simSpeed = 1;          // 1, 10, 60
  let simBaseReal = null;    // ms
  let simBaseVirtual = null; // ms
  let simulated = false;

  function useRealTime() {
    simulated = false;
    simBaseReal = null;
    simBaseVirtual = null;
  }
  function useSimulatedTime(startMs) {
    simulated = true;
    simBaseReal = Date.now();
    simBaseVirtual = startMs || Date.now();
  }
  function setSpeed(s) { simSpeed = s; }
  function now() {
    if (!simulated) return Date.now();
    return simBaseVirtual + (Date.now() - simBaseReal) * simSpeed;
  }
  function isSimulated() { return simulated; }

  // Convert ms to "HH:MM"
  function fmtTime(ms) {
    const d = new Date(ms);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  function fmtMin(min) {
    const h = Math.floor(min / 60) % 24;
    const m = Math.round(min % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  // Position for a trip at a given time (ms)
  function positionFor(trip, timeMs) {
    const depMs = trip.depMin * 60 * 1000; // minutes from midnight of "today"
    // Build absolute departure by anchoring to today's midnight
    const midnight = new Date(timeMs);
    midnight.setHours(0, 0, 0, 0);
    const depAbs = midnight.getTime() + depMs;
    const durMs = trip.durMin * 60 * 1000;
    const arrAbs = depAbs + durMs;

    const stops = trip.stops;
    // origin/destination from stops
    const origin = stops[0];
    const dest = stops[stops.length - 1];

    if (timeMs < depAbs) {
      return {
        state: 'scheduled',
        lat: origin.lat, lng: origin.lng,
        progress: 0,
        nextStop: origin.name,
        etaMin: Math.round((depAbs - timeMs) / 60000),
        arrivesAt: fmtTime(arrAbs),
        depTime: fmtTime(depAbs)
      };
    }
    if (timeMs >= arrAbs) {
      return {
        state: 'arrived',
        lat: dest.lat, lng: dest.lng,
        progress: 1,
        nextStop: dest.name,
        etaMin: 0,
        arrivesAt: fmtTime(arrAbs),
        depTime: fmtTime(depAbs)
      };
    }

    const elapsed = timeMs - depAbs;
    // find segment
    let segIndex = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      if (elapsed >= stops[i].arriveMin * 60 * 1000 && elapsed < stops[i + 1].arriveMin * 60 * 1000) {
        segIndex = i;
        break;
      }
      if (i === stops.length - 2) segIndex = i;
    }

    const s0 = stops[segIndex];
    const s1 = stops[Math.min(segIndex + 1, stops.length - 1)];
    const t0 = s0.arriveMin * 60 * 1000;
    const depart0 = s0.departMin * 60 * 1000;
    const t1 = s1.arriveMin * 60 * 1000;

    let lat, lng, progress;
    if (elapsed <= depart0) {
      // dwelling at stop s0
      lat = s0.lat; lng = s0.lng;
    } else if (elapsed >= t1) {
      lat = s1.lat; lng = s1.lng;
    } else {
      const segDur = Math.max(t1 - depart0, 1);
      const frac = (elapsed - depart0) / segDur;
      lat = s0.lat + (s1.lat - s0.lat) * frac;
      lng = s0.lng + (s1.lng - s0.lng) * frac;
    }

    // overall progress 0..1 by elapsed/duration
    progress = elapsed / durMs;

    // next stop: first stop whose arriveMin*60000 > elapsed
    let nextStop = dest.name;
    let nextArriveMs = arrAbs;
    for (let i = 0; i < stops.length; i++) {
      if (stops[i].arriveMin * 60 * 1000 > elapsed) {
        nextStop = stops[i].name;
        nextArriveMs = depAbs + stops[i].arriveMin * 60 * 1000;
        break;
      }
    }
    const etaMin = Math.round((nextArriveMs - timeMs) / 60000);

    return {
      state: 'running',
      lat: lat, lng: lng,
      progress: progress,
      nextStop: nextStop,
      etaMin: etaMin,
      arrivesAt: fmtTime(arrAbs),
      depTime: fmtTime(depAbs)
    };
  }

  // Heading between two lat/lng points (degrees, 0 = north, clockwise)
  function headingBetween(a, b) {
    const toRad = Math.PI / 180;
    const lat1 = a.lat * toRad, lat2 = b.lat * toRad;
    const dLng = (b.lng - a.lng) * toRad;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    let brng = Math.atan2(y, x) / toRad;
    brng = (brng + 360) % 360;
    return brng;
  }

  window.Sim = {
    CITY: CITY,
    STOP_PLANS: STOP_PLANS,
    trips: trips,
    seedTrips: seedTrips,
    now: now,
    useRealTime: useRealTime,
    useSimulatedTime: useSimulatedTime,
    setSpeed: setSpeed,
    getSpeed: function () { return simSpeed; },
    isSimulated: isSimulated,
    positionFor: positionFor,
    headingBetween: headingBetween,
    fmtTime: fmtTime,
    fmtMin: fmtMin
  };
})();
