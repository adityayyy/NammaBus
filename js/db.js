/* ============================================================
   NammaBus - db.js  (Phase 2A)
   Database-style data layer over localStorage.

   TEACHING NOTE: every page uses ONLY these functions. The
   storage format is plain JSON arrays, one per "table", so this
   file could later be swapped for real SQL calls without
   changing the rest of the app.

   ---------- EQUIVALENT SQL SCHEMA (for SCHEMA.md) ----------
   CREATE TABLE cities (
     id TEXT PRIMARY KEY,
     name_en TEXT NOT NULL,
     name_kn TEXT NOT NULL,
     lat REAL, lng REAL
   );
   CREATE TABLE routes (
     id TEXT PRIMARY KEY,
     from_city TEXT NOT NULL REFERENCES cities(id),
     to_city   TEXT NOT NULL REFERENCES cities(id),
     distance_km REAL NOT NULL,
     duration_min INTEGER NOT NULL
   );
   CREATE TABLE route_stops (
     id TEXT PRIMARY KEY,
     route_id TEXT NOT NULL REFERENCES routes(id),
     city_id  TEXT NOT NULL REFERENCES cities(id),
     stop_order INTEGER NOT NULL,
     minutes_from_start INTEGER NOT NULL
   );
   CREATE TABLE buses (
     id TEXT PRIMARY KEY,
     number TEXT NOT NULL,
     type TEXT NOT NULL,          -- Ordinary/Express/Rajahamsa/Airavat
     total_seats INTEGER NOT NULL,
     fare_per_km REAL NOT NULL
   );
   CREATE TABLE trips (
     id TEXT PRIMARY KEY,
     route_id TEXT NOT NULL REFERENCES routes(id),
     bus_id   TEXT NOT NULL REFERENCES buses(id),
     trip_date TEXT NOT NULL,     -- YYYY-MM-DD
     departure TEXT NOT NULL,     -- HH:MM
     arrival   TEXT NOT NULL      -- HH:MM
   );
   CREATE TABLE seats (
     id TEXT PRIMARY KEY,
     trip_id TEXT NOT NULL REFERENCES trips(id),
     seat_no TEXT NOT NULL,
     status TEXT NOT NULL,        -- available/selected/booked/locked
     locked_until INTEGER,        -- epoch ms, null if not locked
     UNIQUE (trip_id, seat_no)
   );
   CREATE TABLE bookings (
     id TEXT PRIMARY KEY,
     trip_id TEXT NOT NULL REFERENCES trips(id),
     passenger_name TEXT NOT NULL,
     phone TEXT,
     total_fare REAL NOT NULL,
     status TEXT NOT NULL,        -- confirmed/cancelled
     created_at INTEGER NOT NULL
   );
   CREATE TABLE passengers (
     id TEXT PRIMARY KEY,
     booking_id TEXT NOT NULL REFERENCES bookings(id),
     seat_no TEXT NOT NULL,
     name TEXT NOT NULL,
     age INTEGER,
     gender TEXT
   );
   CREATE TABLE booking_seats (
     booking_id TEXT NOT NULL REFERENCES bookings(id),
     seat_no TEXT NOT NULL,
     PRIMARY KEY (booking_id, seat_no)
   );
   ---------------------------------------------------------
   ============================================================ */

(function () {
  'use strict';

  const KEYS = {
    cities: 'nb_cities', routes: 'nb_routes', route_stops: 'nb_route_stops',
    buses: 'nb_buses', trips: 'nb_trips', seats: 'nb_seats',
    bookings: 'nb_bookings', passengers: 'nb_passengers', booking_seats: 'nb_booking_seats'
  };

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }

  // ---------- Reset / seed ----------
  function resetDemo() {
    Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    seedAll();
  }

  function isSeeded() { return load(KEYS.cities).length > 0; }

  function seedAll() {
    if (!window.SEED) { console.error('SEED not found; run data.js first'); return; }
    const S = window.SEED;
    save(KEYS.cities, S.cities);
    save(KEYS.routes, S.routes);
    save(KEYS.route_stops, S.route_stops);
    save(KEYS.buses, S.buses);
    save(KEYS.trips, S.trips);
    // generate seats per trip
    const seats = [];
    S.trips.forEach(function (t) {
      const bus = S.buses.find(function (b) { return b.id === t.bus_id; });
      const n = bus ? bus.total_seats : 40;
      for (let i = 1; i <= n; i++) {
        seats.push({ id: uid('seat'), trip_id: t.id, seat_no: String(i), status: 'available', locked_until: null });
      }
    });
    save(KEYS.seats, seats);
    save(KEYS.bookings, []);
    save(KEYS.passengers, []);
    save(KEYS.booking_seats, []);
  }

  function ensureSeeded() { if (!isSeeded()) seedAll(); }

  // ---------- Cities ----------
  function getCities() { ensureSeeded(); return load(KEYS.cities); }
  function getCity(id) { return getCities().find(function (c) { return c.id === id; }); }

  // ---------- Routes ----------
  function getRoutes() { ensureSeeded(); return load(KEYS.routes); }
  function getRoute(id) { return getRoutes().find(function (r) { return r.id === id; }); }
  function getRouteStops(routeId) {
    ensureSeeded();
    return load(KEYS.route_stops).filter(function (s) { return s.route_id === routeId; })
      .sort(function (a, b) { return a.stop_order - b.stop_order; });
  }

  // ---------- Buses ----------
  function getBuses() { ensureSeeded(); return load(KEYS.buses); }
  function getBus(id) { return getBuses().find(function (b) { return b.id === id; }); }

  // ---------- Trips ----------
  function getTrips() { ensureSeeded(); return load(KEYS.trips); }
  function getTrip(id) { return getTrips().find(function (t) { return t.id === id; }); }
  function getTripsByRoute(fromCity, toCity, date) {
    ensureSeeded();
    const routes = getRoutes().filter(function (r) { return r.from_city === fromCity && r.to_city === toCity; });
    const routeIds = routes.map(function (r) { return r.id; });
    let trips = getTrips().filter(function (t) { return routeIds.indexOf(t.route_id) !== -1; });
    if (date) trips = trips.filter(function (t) { return t.trip_date === date; });
    // attach bus + route
    return trips.map(function (t) {
      const bus = getBus(t.bus_id);
      const route = getRoute(t.route_id);
      return Object.assign({}, t, { bus: bus, route: route });
    });
  }
  // 1-change: all trips whose route endpoints connect via an intermediate city
  function getTripsWithOneChange(fromCity, toCity, date) {
    ensureSeeded();
    const routes = getRoutes();
    const options = [];
    // find intermediate cities
    const intermediates = [];
    routes.forEach(function (r) {
      if (r.from_city === fromCity) intermediates.push(r.to_city);
      if (r.to_city === fromCity) intermediates.push(r.from_city);
    });
    const uniq = Array.from(new Set(intermediates));
    uniq.forEach(function (mid) {
      if (mid === toCity) return;
      const r1 = routes.filter(function (r) { return (r.from_city === fromCity && r.to_city === mid) || (r.to_city === fromCity && r.from_city === mid); });
      const r2 = routes.filter(function (r) { return (r.from_city === mid && r.to_city === toCity) || (r.to_city === mid && r.from_city === toCity); });
      if (r1.length && r2.length) {
        const t1 = getTrips().filter(function (t) { return r1.map(function (x){return x.id;}).indexOf(t.route_id) !== -1 && (!date || t.trip_date === date); });
        const t2 = getTrips().filter(function (t) { return r2.map(function (x){return x.id;}).indexOf(t.route_id) !== -1 && (!date || t.trip_date === date); });
        if (t1.length && t2.length) {
          options.push({ intermediate: mid, first: t1[0], second: t2[0] });
        }
      }
    });
    return options;
  }

  // ---------- Seats ----------
  function getSeats(tripId) {
    ensureSeeded();
    releaseExpiredLocks(tripId);
    return load(KEYS.seats).filter(function (s) { return s.trip_id === tripId; })
      .sort(function (a, b) { return parseInt(a.seat_no) - parseInt(b.seat_no); });
  }
  function releaseExpiredLocks(tripId) {
    const now = Date.now();
    const all = load(KEYS.seats);
    let changed = false;
    all.forEach(function (s) {
      if (s.trip_id === tripId && s.status === 'locked' && s.locked_until && s.locked_until < now) {
        s.status = 'available'; s.locked_until = null; changed = true;
      }
    });
    if (changed) save(KEYS.seats, all);
  }
  function lockSeats(tripId, seatNos) {
    ensureSeeded();
    releaseExpiredLocks(tripId);
    const all = load(KEYS.seats);
    const now = Date.now();
    const expiry = now + 5 * 60 * 1000;
    // check availability
    for (let i = 0; i < seatNos.length; i++) {
      const s = all.find(function (x) { return x.trip_id === tripId && x.seat_no === String(seatNos[i]); });
      if (!s || s.status !== 'available') return { ok: false, reason: 'Seat ' + seatNos[i] + ' not available' };
    }
    seatNos.forEach(function (sn) {
      const s = all.find(function (x) { return x.trip_id === tripId && x.seat_no === String(sn); });
      s.status = 'locked'; s.locked_until = expiry;
    });
    save(KEYS.seats, all);
    return { ok: true, expiry: expiry };
  }
  function unlockSeats(tripId, seatNos) {
    const all = load(KEYS.seats);
    seatNos.forEach(function (sn) {
      const s = all.find(function (x) { return x.trip_id === tripId && x.seat_no === String(sn); });
      if (s && s.status === 'locked') { s.status = 'available'; s.locked_until = null; }
    });
    save(KEYS.seats, all);
  }

  // ---------- Booking ----------
  function confirmBooking(data) {
    // data: { tripId, passengerName, phone, seats:[{seatNo,name,age,gender}], totalFare }
    ensureSeeded();
    releaseExpiredLocks(data.tripId);
    const allSeats = load(KEYS.seats);
    // double-booking guard: every seat must be locked or available-owned by this lock
    for (let i = 0; i < data.seats.length; i++) {
      const s = allSeats.find(function (x) { return x.trip_id === data.tripId && x.seat_no === String(data.seats[i].seatNo); });
      if (!s || (s.status !== 'locked' && s.status !== 'available')) {
        return { ok: false, reason: 'Seat ' + data.seats[i].seatNo + ' no longer available' };
      }
    }
    const bookingId = uid('BK');
    const bookings = load(KEYS.bookings);
    bookings.push({
      id: bookingId, trip_id: data.tripId,
      passenger_name: data.passengerName, phone: data.phone,
      total_fare: data.totalFare, status: 'confirmed',
      created_at: Date.now()
    });
    save(KEYS.bookings, bookings);

    const passengers = load(KEYS.passengers);
    const bs = load(KEYS.booking_seats);
    data.seats.forEach(function (ps) {
      passengers.push({ id: uid('P'), booking_id: bookingId, seat_no: String(ps.seatNo), name: ps.name, age: ps.age, gender: ps.gender });
      bs.push({ booking_id: bookingId, seat_no: String(ps.seatNo) });
      // mark seat booked
      const s = allSeats.find(function (x) { return x.trip_id === data.tripId && x.seat_no === String(ps.seatNo); });
      if (s) { s.status = 'booked'; s.locked_until = null; }
    });
    save(KEYS.passengers, passengers);
    save(KEYS.booking_seats, bs);
    save(KEYS.seats, allSeats);
    return { ok: true, bookingId: bookingId };
  }

  function cancelBooking(id) {
    const bookings = load(KEYS.bookings);
    const b = bookings.find(function (x) { return x.id === id; });
    if (!b) return { ok: false, reason: 'Booking not found' };
    // refund rule
    const trip = getTrip(b.trip_id);
    let depMs = Date.now();
    if (trip) {
      const d = new Date();
      const parts = trip.departure.split(':');
      d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
      depMs = d.getTime();
      if (trip.trip_date) {
        const td = new Date(trip.trip_date + 'T' + trip.departure);
        depMs = td.getTime();
      }
    }
    const hoursBefore = (depMs - Date.now()) / 3600000;
    const refundPct = hoursBefore > 24 ? 0.9 : 0.5;
    const refund = Math.round(b.total_fare * refundPct);

    b.status = 'cancelled';
    save(KEYS.bookings, bookings);
    // release seats
    const bs = load(KEYS.booking_seats).filter(function (x) { return x.booking_id === id; });
    const seatNos = bs.map(function (x) { return x.seat_no; });
    const allSeats = load(KEYS.seats);
    seatNos.forEach(function (sn) {
      const s = allSeats.find(function (x) { return x.trip_id === b.trip_id && x.seat_no === sn; });
      if (s) { s.status = 'available'; s.locked_until = null; }
    });
    save(KEYS.seats, allSeats);
    return { ok: true, refund: refund, refundPct: refundPct };
  }

  function getBookings() { ensureSeeded(); return load(KEYS.bookings); }
  function getBooking(id) { return getBookings().find(function (b) { return b.id === id; }); }
  function getPassengers(bookingId) { return load(KEYS.passengers).filter(function (p) { return p.booking_id === bookingId; }); }
  function getBookingSeats(bookingId) { return load(KEYS.booking_seats).filter(function (x) { return x.booking_id === bookingId; }).map(function (x) { return x.seat_no; }); }

  // ---------- Graph (Dijkstra) helper re-exported here for convenience ----------
  // (actual Dijkstra lives in graph.js; db just provides edges)

  // ---------- Admin helpers ----------
  function addBus(data) {
    const buses = load(KEYS.buses);
    const id = data.id || uid('B');
    buses.push({ id: id, number: data.number, type: data.type, total_seats: data.total_seats, fare_per_km: data.fare_per_km });
    save(KEYS.buses, buses);
    return id;
  }
  function addRoute(data) {
    const routes = load(KEYS.routes);
    const id = data.id || (data.from_city + '-' + data.to_city);
    routes.push({ id: id, from_city: data.from_city, to_city: data.to_city, distance_km: data.distance_km, duration_min: data.duration_min });
    save(KEYS.routes, routes);
    return id;
  }
  function addTrip(data) {
    const trips = load(KEYS.trips);
    const id = data.id || uid('TR');
    trips.push({ id: id, route_id: data.route_id, bus_id: data.bus_id, trip_date: data.trip_date, departure: data.departure, arrival: data.arrival });
    save(KEYS.trips, trips);
    // generate seats
    const bus = getBus(data.bus_id);
    const n = bus ? bus.total_seats : 40;
    const seats = load(KEYS.seats);
    for (let i = 1; i <= n; i++) seats.push({ id: uid('seat'), trip_id: id, seat_no: String(i), status: 'available', locked_until: null });
    save(KEYS.seats, seats);
    return id;
  }

  // ---------- Auto init ----------
  ensureSeeded();

  window.DB = {
    resetDemo: resetDemo,
    getCities: getCities, getCity: getCity,
    getRoutes: getRoutes, getRoute: getRoute, getRouteStops: getRouteStops,
    getBuses: getBuses, getBus: getBus,
    getTrips: getTrips, getTrip: getTrip,
    getTripsByRoute: getTripsByRoute,
    getTripsWithOneChange: getTripsWithOneChange,
    getSeats: getSeats, lockSeats: lockSeats, unlockSeats: unlockSeats, releaseExpiredLocks: releaseExpiredLocks,
    confirmBooking: confirmBooking, cancelBooking: cancelBooking,
    getBookings: getBookings, getBooking: getBooking,
    getPassengers: getPassengers, getBookingSeats: getBookingSeats,
    addBus: addBus, addRoute: addRoute, addTrip: addTrip
  };
})();
