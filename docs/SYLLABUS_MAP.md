# NammaBus — Syllabus Mapping

## Web Technology (HTML/CSS/JS)
- **All pages**: Semantic HTML5, CSS3 custom properties, vanilla ES6 modules
- **DOM & Events**: Search form, seat grid clicks, payment form validation, map interactions
- **localStorage**: `js/db.js` implements 9-table relational layer over localStorage
- **SVG/Canvas**: QR code generation on `ticket.html`, bus marker icons
- **CSS Animation**: Loading spinner, toast fade-in, map marker transitions
- **Fetch API**: `data/routes.json` loaded at runtime
- **Leaflet**: Map rendering, polylines, markers, zoom/pan controls

## DBMS (Database Concepts)
- **Table Design**: 9 tables (cities, routes, route_stops, buses, trips, seats, bookings, passengers, booking_seats)
- **Keys & Relationships**: Primary keys, foreign keys (e.g., seats.trip_id → trips.id, booking_seats links bookings ↔ seats)
- **Normalization**: 3NF — no repeating groups, non-key attributes depend on whole key
- **SQL Equivalent**: Full CREATE TABLE statements in `js/db.js` header comment
- **Seat Lock as Transaction**: `lockSeats` + `confirmBooking` implement optimistic locking with 5-min TTL; `releaseExpiredLocks` cleans up on every read

## ADA (Algorithms & Data Structures)
- **Dijkstra** (`js/graph.js`): Shortest path + fare on city graph (adjacency list + array-based priority queue). Used for "1 change" route finding.
- **Greedy Seat Allocation** (`js/graph.js::pickSeatsTogether`): Picks N consecutive-ish seats in O(S·n) where S=seats.
- **ETA Priority Queue** (`js/graph.js::orderByEta`): Insertion sort by ETA for bus list ordering.
- **Clock-based Position** (`js/sim.js::positionFor`): Progress along polyline with stop dwell times.
- **Angle Interpolation** (`js/buses.js::lerpAngle`): Shortest-turn heading rotation.

## Data Structures
- **Graph**: Adjacency list (city → [{to, distance, routeId}])
- **Queue/Priority Queue**: Array-based min-heap for Dijkstra; insertion sort for ETA ordering
- **Arrays & Hash Maps**: `localStorage` tables as arrays; `busState` object keyed by tripId; `selected` Set for seats

## Software Engineering
- **Requirements**: Search → Map → Seats → Payment → Ticket → My Bookings → Admin
- **Use Cases**: Search route, View live map, Select seats, Pay, Get ticket, Cancel booking, Admin CRUD
- **Test Cases** (see below)

---

## Test Cases Table

| # | Feature | Steps | Expected |
|---|---------|-------|----------|
| 1 | Home search | Open index.html, pick From=Belagavi, To=Bengaluru, today, click Search | Redirects to map.html with route highlighted, bus list shows direct trips |
| 2 | Map direct buses | On map, search Belagavi→Hubballi | Bus list shows direct trips with type badge, ETA, seats |
| 3 | Map 1-change | Search Belagavi→Mysuru (no direct) | Shows "1 change" options via intermediate city |
| 4 | Follow mode | Click bus item → "Follow" | Map pans to bus, zoom 12, trail appears, banner shows next stop |
| 5 | Seat selection | Click "Select seats" on a bus | seats.html opens, grid renders (2+2 or 2+1), seats clickable |
| 6 | Seat lock timer | Select 2 seats, fill forms, click Proceed | Payment page opens, lockBar shows 5:00 countdown |
| 7 | Payment success | Fill card form, click Pay | Redirects to ticket.html with booking ID, QR rendered |
| 8 | Ticket print | On ticket.html, click Print | Print dialog opens, header/footer hidden |
| 9 | Booking cancel | On bookings.html, click Cancel on confirmed | Shows refund % (90% if >24h, 50% otherwise), confirms, releases seats |
| 10 | Admin add bus | admin.html → fill form → Add | Bus appears in list, persists after reload |
| 11 | Language toggle | Click ಕ / EN button | All labels switch to Kannada / English |
| 12 | Theme toggle | Click ◐ button | Map tiles invert, CSS variables swap |
| 13 | Time travel | Open sidebar → move slider → 10x | Clock jumps, buses jump positions |
| 14 | Replay | Follow a bus → drag map → click Re-centre | Follow pauses, Re-centre restores |
| 15 | Responsive | Resize to 390px width | Sidebar becomes bottom sheet, map fills screen |
| 16 | Prefers-reduced-motion | OS setting on | No map marker animation, no toast animation |
| 17 | Seat double-book | Open two tabs same trip, select same seat | Second tab shows "not available" |
| 18 | Lock expiry | Select seat, wait 5 min (or mock time) | Seat returns to available, lockBar hides |

---

## File Structure
```
index.html, map.html, seats.html, payment.html, ticket.html, bookings.html, admin.html
css/base.css, layout.css, components.css, map.css, pages.css
js/db.js, data.js, sim.js, graph.js, map.js, buses.js, seats.js, payment.js, ticket.js, bookings.js, admin.js, ui.js, i18n.js, liveFeed.js
lib/leaflet.js, leaflet.css, images/
data/routes.json
docs/README.md, SCHEMA.md, SYLLABUS_MAP.md
scripts/fetch-routes.html
```

---

## Run
```bash
cd NammaBus-Live
python -m http.server 8765
# open http://localhost:8765/index.html
```