/* ============================================================
   NammaBus - data.js  (Phase 2A)
   Seed data: 14 cities, 8 routes, 12 buses, trips, stops.
   Loaded before db.js? No - db.js calls window.SEED at runtime,
   and data.js sets window.SEED. Script order in pages must be
   data.js then db.js.
   ============================================================ */

(function () {
  'use strict';

  const cities = [
    { id: 'belagavi',   name_en: 'Belagavi',   name_kn: 'ಬೆಳಗಾವಿ',   lat: 15.8497, lng: 74.4977 },
    { id: 'dharwad',    name_en: 'Dharwad',    name_kn: 'ಧಾರವಾಡ',    lat: 15.4589, lng: 75.0078 },
    { id: 'hubballi',   name_en: 'Hubballi',   name_kn: 'ಹುಬ್ಬಳ್ಳಿ',   lat: 15.3647, lng: 75.1240 },
    { id: 'gadag',      name_en: 'Gadag',      name_kn: 'ಗಡಗ್',      lat: 15.4256, lng: 75.6270 },
    { id: 'vijayapura', name_en: 'Vijayapura', name_kn: 'ವಿಜಯಪುರ',   lat: 16.8302, lng: 75.7100 },
    { id: 'kalaburagi', name_en: 'Kalaburagi', name_kn: 'ಕಲಬುರಗಿ',   lat: 17.3297, lng: 76.8343 },
    { id: 'ballari',    name_en: 'Ballari',    name_kn: 'ಬಳ್ಳಾರಿ',    lat: 15.1394, lng: 76.9214 },
    { id: 'davangere',  name_en: 'Davangere',  name_kn: 'ದಾವಣಗೆರೆ',   lat: 14.4644, lng: 75.9218 },
    { id: 'shivamogga', name_en: 'Shivamogga', name_kn: 'ಶಿವಮೊಗ್ಗ',   lat: 13.9299, lng: 75.5681 },
    { id: 'mysuru',     name_en: 'Mysuru',     name_kn: 'ಮೈಸೂರು',     lat: 12.2958, lng: 76.6394 },
    { id: 'mangaluru',  name_en: 'Mangaluru',  name_kn: 'ಮಂಗಳೂರು',   lat: 12.9141, lng: 74.8560 },
    { id: 'bengaluru',  name_en: 'Bengaluru',  name_kn: 'ಬೆಂಗಳೂರು',   lat: 12.9716, lng: 77.5946 },
    { id: 'udupi',      name_en: 'Udupi',      name_kn: 'ಉಡುಪಿ',      lat: 13.3409, lng: 74.7421 },
    { id: 'karwar',     name_en: 'Karwar',     name_kn: 'ಕಾರವಾರ',     lat: 14.8131, lng: 74.1297 }
  ];

  // distances from routes.json (km)
  const routes = [
    { id: 'belagavi-hubballi',   from_city: 'belagavi', to_city: 'hubballi',   distance_km: 103, duration_min: 135 },
    { id: 'belagavi-dharwad',    from_city: 'belagavi', to_city: 'dharwad',    distance_km: 78,  duration_min: 100 },
    { id: 'belagavi-bengaluru',  from_city: 'belagavi', to_city: 'bengaluru',  distance_km: 505, duration_min: 510 },
    { id: 'hubballi-bengaluru',  from_city: 'hubballi', to_city: 'bengaluru',  distance_km: 405, duration_min: 450 },
    { id: 'bengaluru-mysuru',    from_city: 'bengaluru', to_city: 'mysuru',    distance_km: 145, duration_min: 150 },
    { id: 'bengaluru-mangaluru', from_city: 'bengaluru', to_city: 'mangaluru', distance_km: 352, duration_min: 420 },
    { id: 'belagavi-vijayapura', from_city: 'belagavi', to_city: 'vijayapura', distance_km: 195, duration_min: 210 },
    { id: 'bengaluru-ballari',   from_city: 'bengaluru', to_city: 'ballari',   distance_km: 310, duration_min: 330 }
  ];

  const route_stops = [
    { id: 'rs1', route_id: 'belagavi-hubballi', city_id: 'belagavi', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs2', route_id: 'belagavi-hubballi', city_id: 'dharwad',  stop_order: 2, minutes_from_start: 55 },
    { id: 'rs3', route_id: 'belagavi-hubballi', city_id: 'hubballi', stop_order: 3, minutes_from_start: 135 },
    { id: 'rs4', route_id: 'belagavi-dharwad', city_id: 'belagavi', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs5', route_id: 'belagavi-dharwad', city_id: 'dharwad',  stop_order: 2, minutes_from_start: 100 },
    { id: 'rs6', route_id: 'belagavi-bengaluru', city_id: 'belagavi', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs7', route_id: 'belagavi-bengaluru', city_id: 'hubballi', stop_order: 2, minutes_from_start: 135 },
    { id: 'rs8', route_id: 'belagavi-bengaluru', city_id: 'davangere', stop_order: 3, minutes_from_start: 300 },
    { id: 'rs9', route_id: 'belagavi-bengaluru', city_id: 'bengaluru', stop_order: 4, minutes_from_start: 510 },
    { id: 'rs10', route_id: 'hubballi-bengaluru', city_id: 'hubballi', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs11', route_id: 'hubballi-bengaluru', city_id: 'davangere', stop_order: 2, minutes_from_start: 200 },
    { id: 'rs12', route_id: 'hubballi-bengaluru', city_id: 'bengaluru', stop_order: 3, minutes_from_start: 450 },
    { id: 'rs13', route_id: 'bengaluru-mysuru', city_id: 'bengaluru', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs14', route_id: 'bengaluru-mysuru', city_id: 'mysuru', stop_order: 2, minutes_from_start: 150 },
    { id: 'rs15', route_id: 'bengaluru-mangaluru', city_id: 'bengaluru', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs16', route_id: 'bengaluru-mangaluru', city_id: 'mangaluru', stop_order: 2, minutes_from_start: 420 },
    { id: 'rs17', route_id: 'belagavi-vijayapura', city_id: 'belagavi', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs18', route_id: 'belagavi-vijayapura', city_id: 'vijayapura', stop_order: 2, minutes_from_start: 210 },
    { id: 'rs19', route_id: 'bengaluru-ballari', city_id: 'bengaluru', stop_order: 1, minutes_from_start: 0 },
    { id: 'rs20', route_id: 'bengaluru-ballari', city_id: 'ballari', stop_order: 2, minutes_from_start: 330 }
  ];

  const buses = [
    { id: 'B1', number: 'KA 25 F 1001', type: 'Ordinary',   total_seats: 45, fare_per_km: 0.8 },
    { id: 'B2', number: 'KA 25 F 1002', type: 'Express',    total_seats: 40, fare_per_km: 1.1 },
    { id: 'B3', number: 'KA 25 F 1003', type: 'Rajahamsa',  total_seats: 36, fare_per_km: 1.4 },
    { id: 'B4', number: 'KA 25 F 1004', type: 'Airavat',    total_seats: 30, fare_per_km: 1.8 },
    { id: 'B5', number: 'KA 22 F 2001', type: 'Ordinary',   total_seats: 45, fare_per_km: 0.8 },
    { id: 'B6', number: 'KA 22 F 2002', type: 'Express',    total_seats: 40, fare_per_km: 1.1 },
    { id: 'B7', number: 'KA 01 F 3001', type: 'Rajahamsa',  total_seats: 36, fare_per_km: 1.4 },
    { id: 'B8', number: 'KA 01 F 3002', type: 'Airavat',    total_seats: 30, fare_per_km: 1.8 },
    { id: 'B9', number: 'KA 09 F 4001', type: 'Express',    total_seats: 40, fare_per_km: 1.1 },
    { id: 'B10', number: 'KA 09 F 4002', type: 'Ordinary',  total_seats: 45, fare_per_km: 0.8 },
    { id: 'B11', number: 'KA 18 F 5001', type: 'Rajahamsa', total_seats: 36, fare_per_km: 1.4 },
    { id: 'B12', number: 'KA 18 F 5002', type: 'Airavat',   total_seats: 30, fare_per_km: 1.8 }
  ];

  // Trips: 2-3 per route for today and tomorrow
  function makeTrips() {
    const trips = [];
    const dates = [today(), tomorrow()];
    const assignments = [
      { route: 'belagavi-hubballi',   buses: ['B1', 'B2'] },
      { route: 'belagavi-dharwad',    buses: ['B5', 'B10'] },
      { route: 'belagavi-bengaluru',  buses: ['B3', 'B4'] },
      { route: 'hubballi-bengaluru',  buses: ['B6', 'B7'] },
      { route: 'bengaluru-mysuru',    buses: ['B8', 'B9'] },
      { route: 'bengaluru-mangaluru', buses: ['B11', 'B12'] },
      { route: 'belagavi-vijayapura', buses: ['B1', 'B5'] },
      { route: 'bengaluru-ballari',   buses: ['B2', 'B6'] }
    ];
    const departures = ['06:00', '09:30', '14:00', '18:30', '22:00'];
    let tid = 1;
    assignments.forEach(function (a) {
      const route = routes.find(function (r) { return r.id === a.route; });
      a.buses.forEach(function (bid, idx) {
        dates.forEach(function (date) {
          const dep = departures[(idx + (date === dates[1] ? 2 : 0)) % departures.length];
          const arrMin = toMinutes(dep) + route.duration_min;
          const arr = fromMinutes(arrMin);
          trips.push({
            id: 'TR' + (tid++),
            route_id: a.route,
            bus_id: bid,
            trip_date: date,
            departure: dep,
            arrival: arr
          });
        });
      });
    });
    return trips;
  }

  function today() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function tomorrow() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function toMinutes(hhmm) {
    const p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function fromMinutes(m) {
    m = m % (24 * 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  window.SEED = {
    cities: cities,
    routes: routes,
    route_stops: route_stops,
    buses: buses,
    trips: makeTrips()
  };
})();
