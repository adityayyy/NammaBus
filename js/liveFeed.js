/* ============================================================
   NammaBus - liveFeed.js (Phase 1.6, design only)
   Optional hook for a REAL GPS bus.

   HOW A REAL TRACKER WOULD FEED THIS:
   - An ESP32 (or any device) with a GPS module reads lat/lng
     and POSTs { busId, lat, lng, speed, heading, ts } to a
     small backend (e.g. a Node/Python server or Firebase).
   - The frontend polls that endpoint (or uses WebSocket/SSE)
     and caches the latest position per busId.
   - getLivePosition(busId) returns { lat, lng, heading, speed, ts }
     when fresh data exists, otherwise null.

   For now this always returns null, so the app uses the
   clock-based simulated positions from sim.js.
   ============================================================ */

(function () {
  'use strict';

  // Cache of latest GPS fixes: { busId: { lat, lng, heading, speed, ts } }
  const cache = {};

  // Example (commented out) of how to wire a real feed:
  // setInterval(function () {
  //   fetch('/api/live-positions').then(r => r.json()).then(data => {
  //     data.forEach(function (p) { cache[p.busId] = p; });
  //   });
  // }, 5000);

  function getLivePosition(busId) {
    const p = cache[busId];
    if (!p) return null;
    // Consider stale after 30 seconds
    if (Date.now() - p.ts > 30000) return null;
    return { lat: p.lat, lng: p.lng, heading: p.heading, speed: p.speed, ts: p.ts, live: true };
  }

  window.LiveFeed = { getLivePosition: getLivePosition, _cache: cache };
})();
