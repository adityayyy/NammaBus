# NammaBus

Student prototype for Karnataka bus tracking and seat booking.
Not an official KSRTC/BMTC service. All bus data is simulated.

## What is real vs simulated

- **Real:** the base map (OpenStreetMap tiles via Leaflet), road geometry
  (fetched once from OSRM and stored in `data/routes.json`), and city
  locations.
- **Simulated (clock-based):** bus positions. Each trip has a departure
  time, a route polyline and a duration. The position is calculated from
  the current clock: `progress = (now - departure) / duration`, then the
  point along the polyline is found at that fraction, including stop dwell
  times. There is no GPS. The "Simulated data" badge tooltip explains this.
- **Optional real GPS hook:** `js/liveFeed.js` exposes `getLivePosition(busId)`,
  which returns `null` for now. If it returns coordinates, the map uses them
  instead and labels the bus "Live GPS". See that file for how an ESP32
  tracker could feed it later.

## Run

Open `index.html` in a browser. For the map page to load `data/routes.json`
via fetch, serve the folder over HTTP (e.g. `python -m http.server`).
Opening `index.html` directly also works for most features.
