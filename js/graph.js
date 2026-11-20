/* ============================================================
   NammaBus - graph.js  (Phase 2A)
   ADA: Dijkstra shortest path + fare on the city graph.
   Also: greedy "N seats together" allocator and a priority
   queue for ETA ordering.
   ============================================================ */

(function () {
  'use strict';

  // ---------- Graph (adjacency list) ----------
  // Built from db routes. Each edge: { to, distance (km), routeId, busType }
  function buildGraph() {
    const routes = window.DB.getRoutes();
    const adj = {};
    const cities = window.DB.getCities();
    cities.forEach(function (c) { adj[c.id] = []; });
    routes.forEach(function (r) {
      const bus = null;
      const d = r.distance_km;
      if (!adj[r.from_city]) adj[r.from_city] = [];
      if (!adj[r.to_city]) adj[r.to_city] = [];
      adj[r.from_city].push({ to: r.to_city, distance: d, routeId: r.id, directed: false });
      adj[r.to_city].push({ to: r.from_city, distance: d, routeId: r.id, directed: false });
    });
    return adj;
  }

  // ---------- Dijkstra ----------
  // Returns { path: [cityId,...], distance: km, fare: rupees, steps:[{from,to,routeId,distance}] }
  // farePerKm by bus type; we use Express rate as default for connecting (demo).
  function dijkstra(from, to) {
    const adj = buildGraph();
    const INF = Infinity;
    const dist = {};
    const prev = {};
    const visited = {};
    Object.keys(adj).forEach(function (c) { dist[c] = INF; prev[c] = null; });

    // Priority queue (min-heap by distance) - simple array-based for clarity
    const pq = [];
    function push(node, d) { pq.push({ node: node, d: d }); }
    function pop() {
      if (pq.length === 0) return null;
      // find min
      let minIdx = 0;
      for (let i = 1; i < pq.length; i++) if (pq[i].d < pq[minIdx].d) minIdx = i;
      const item = pq.splice(minIdx, 1)[0];
      return item;
    }

    dist[from] = 0;
    push(from, 0);

    while (pq.length > 0) {
      const cur = pop();
      if (!cur) break;
      if (visited[cur.node]) continue;
      visited[cur.node] = true;
      if (cur.node === to) break;
      const neighbors = adj[cur.node] || [];
      neighbors.forEach(function (e) {
        if (visited[e.to]) return;
        const alt = dist[cur.node] + e.distance;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          prev[e.to] = cur.node;
          push(e.to, alt);
        }
      });
    }

    if (dist[to] === INF) return null;

    // reconstruct path
    const path = [];
    let u = to;
    while (u) { path.unshift(u); u = prev[u]; }
    // build steps
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const edge = (adj[a] || []).find(function (e) { return e.to === b; });
      steps.push({ from: a, to: b, routeId: edge ? edge.routeId : null, distance: edge ? edge.distance : 0 });
    }
    const fare = Math.round(dist[to] * 1.1 + 20); // Express rate + reservation fee (demo)
    return { path: path, distance: dist[to], fare: fare, steps: steps };
  }

  // ---------- Greedy seat allocation ----------
  // Given a list of seat numbers (strings) that are available,
  // pick `n` seats that are consecutive (or closest together).
  // Returns array of seat numbers, or null if not possible.
  // Complexity: O(S * n) where S = number of seats.
  function pickSeatsTogether(availableSeats, n) {
    if (n <= 0) return [];
    const sorted = availableSeats.map(function (s) { return parseInt(s, 10); }).sort(function (a, b) { return a - b; });
    if (sorted.length < n) return null;
    // greedy: find the window of n consecutive-ish seats with smallest spread
    let bestStart = 0;
    let bestSpread = Infinity;
    for (let i = 0; i <= sorted.length - n; i++) {
      const spread = sorted[i + n - 1] - sorted[i];
      if (spread < bestSpread) { bestSpread = spread; bestStart = i; }
    }
    return sorted.slice(bestStart, bestStart + n).map(function (x) { return String(x); });
  }

  // ---------- Priority queue for ETA ordering ----------
  // Returns trips sorted by ETA (ascending). Uses a simple insertion sort
  // (priority queue) so the soonest bus is always first.
  function orderByEta(tripsWithEta) {
    const arr = tripsWithEta.slice();
    // insertion sort by eta
    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];
      let j = i - 1;
      while (j >= 0 && arr[j].eta > key.eta) { arr[j + 1] = arr[j]; j--; }
      arr[j + 1] = key;
    }
    return arr;
  }

  window.Graph = {
    buildGraph: buildGraph,
    dijkstra: dijkstra,
    pickSeatsTogether: pickSeatsTogether,
    orderByEta: orderByEta
  };
})();
