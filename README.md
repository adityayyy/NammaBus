# NammaBus

A live Bengaluru bus map. Buses are shown at their **real-time GPS positions**
on a 2D map (Leaflet) and a 3D view (MapLibre GL).

This is an independent student prototype and **not an official KSRTC/BMTC
service**.

---

## What is shown

| | Source |
|---|---|
| Base map tiles | OpenStreetMap / CARTO |
| Bus positions | **Live** GPS |
| Bus numbers / service type | **Live** — registration number and AC / Non-AC |
| Route lines | Drawn when you search a route |

There is **no booking, payment, ticket, or seat-selection** functionality.

---

## Features

- **Live bus map** — currently tracked vehicles as bus markers at their real
  GPS positions, refreshed every 30 seconds (first 100 vehicles)
- **2D / 3D toggle** — smooth camera tilt between the Leaflet map and the
  MapLibre GL 3D view; buses appear in both
- **Route search** — type a route number (e.g. `335`, `600`) to filter buses
  and draw the route line
- **Dropdown panel** — the search/bus panel slides up into the navbar; the
  single toggle button at the bottom of the panel opens and closes it
- **Worldwide map** — no bounds restriction: pan and zoom freely
- **Theme** — light/dark toggle (persisted)
- **i18n** — English / Kannada toggle

---

## Run locally

The app needs an HTTP server (not `file://`). Use the included Node server:

```bash
node server.js
```

Then open **http://localhost:8765/map.html**

> `python -m http.server` will **not** work — it cannot serve one of the
> browser requests the app makes. Node 18 or newer is required.

---

## Project structure

```
index.html          Home page
map.html            Live bus map (2D + 3D)
admin.html          Admin (add buses/routes, reset)
server.js           Local dev server
js/bmtc.js          Live bus layer (markers, 3D layer, bus list)
js/map.js           Leaflet 2D map, search, panel controls
js/map3d.js         MapLibre GL 3D map setup
js/config.js        CARTO key + tile URLs
js/theme.js         Theme toggle
js/i18n.js          English / Kannada
css/*.css           Design tokens and page styles
data/routes.json    Route geometry
lib/leaflet.*       Leaflet library
scripts/            Route-fetch dev helper
```

---

## Notes

- The CARTO basemap key is bundled in `js/config.js`; `.env` and `carto-key.txt`
  are gitignored and optional for local use.
- Base map tiles © OpenStreetMap contributors © CARTO.
