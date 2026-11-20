# NammaBus — Student Prototype (Mockup)

**NammaBus is a mockup and prototype project. It is NOT a live bus tracker.** No real buses, no real GPS, no real bookings, and no real money are involved. All bus positions, routes, fares, bookings, and payments are simulated for demonstration purposes only.

This is **not an official KSRTC/BMTC service**. It is a student web technology / DBMS / ADA project prototype.

---

## What is real vs simulated

| | Real | Simulated |
|---|------|-----------|
| Base map tiles | OpenStreetMap / CARTO (via Leaflet & MapLibre) | — |
| Road geometry | Fetched once from OSRM, stored in `data/routes.json` | — |
| City locations | Real Karnataka city coordinates | — |
| Bus positions | — | Clock-based simulation from timetable + route polyline |
| Bus movement | — | Computed from departure time + duration (no GPS) |
| Bookings | — | localStorage only, cleared on reset |
| Payments | — | Demo-only, random success/failure, no money |

The "Simulated data" badge and status ticker explain this on every page.

---

## Features (all simulated)

- **Home**: route search, popular routes table, "how it works" steps
- **Live Map**: Karnataka map with simulated moving buses, follow mode, time travel, route search, filters
- **Seats**: seat grid, 5-minute lock timer, passenger details, auto-pick
- **Payment**: demo card/UPI payment (random success), no real money
- **Ticket**: booking summary, deterministic QR-like pattern, print
- **Bookings**: upcoming/past, cancel with refund rules
- **Admin**: add buses/routes/trips, reset demo data
- **Theme**: light/dark toggle (persisted)
- **3D Map**: MapLibre GL 3D view (toggle from map page)
- **i18n**: English / Kannada toggle

---

## Tech stack

- HTML5, CSS3 (custom properties, no framework), vanilla ES6 JavaScript
- Leaflet (2D map), MapLibre GL (3D map)
- CARTO basemaps (API key required — see below)
- localStorage relational layer (9 tables: cities, routes, buses, trips, seats, bookings, passengers, booking_seats, route_stops)
- Dijkstra shortest-path, greedy seat allocation, clock-based bus position simulation

---

## Run

Serve the folder over HTTP (required for `fetch()` of `data/routes.json` and `carto-key.txt`):

```bash
python -m http.server 8765
# open http://localhost:8765/index.html
```

Opening `index.html` directly also works for most features, but the map needs HTTP to load route geometry.

---

## CARTO API key

The map uses CARTO basemaps. Create a `carto-key.txt` file in the project root containing your CARTO API key (first line, no quotes). Without it, the map shows a red banner and tiles will not load.

`carto-key.txt` is in `.gitignore` — do not commit it.

---

## Data honesty

All bus positions, fares, bookings, and payments are simulated. The status chip reads "SIMULATED - TICK 2S" and the footer states: "All buses, fares and payments are simulated. No real money is handled." Never present this as a live tracking system.

---

## Project structure

```
index.html          Home page
map.html            Live map (2D + 3D toggle)
seats.html          Seat selection
payment.html        Demo payment
ticket.html         Ticket + print
bookings.html       My bookings / cancel
admin.html          Admin (add buses, routes, reset)
js/config.js        CARTO key loader + tile URL helper
js/theme.js         Light/dark theme toggle
js/map.js           Leaflet 2D map
js/map3d.js         MapLibre GL 3D map
js/buses.js         Bus markers, follow mode, trails
js/sim.js           Clock-based bus position simulation
js/db.js            localStorage relational layer (9 tables)
js/data.js          Seed data (cities, routes, buses, trips)
js/graph.js         Dijkstra, seat allocation, ETA ordering
js/i18n.js          English / Kannada
js/liveFeed.js      Optional real-GPS hook (returns null)
js/seats.js         Seat grid + 5-min lock
js/payment.js       Demo payment
js/ticket.js        Ticket + QR
js/bookings.js      Bookings + cancel + refund
js/admin.js         Admin CRUD
js/ui.js            Toasts
css/*.css           Stratum-inspired flat design tokens
data/routes.json    OSRM road geometry
lib/leaflet.*       Leaflet library
carto-key.txt       CARTO API key (create this, gitignored)
docs/               SCHEMA, README, syllabus mapping
```

---

## License / attribution

Base map tiles © OpenStreetMap contributors © CARTO. All bus data, fares, and payments are simulated demo data.