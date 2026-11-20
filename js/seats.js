/* ============================================================
   NammaBus - seats.js  (Phase 2A)
   Seat grid, greedy auto-pick, 5-min lock, passenger forms.
   ============================================================ */

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const tripId = params.get('trip');
  const trip = window.DB ? window.DB.getTrip(tripId) : null;
  const bus = trip ? window.DB.getBus(trip.bus_id) : null;
  const route = trip ? window.DB.getRoute(trip.route_id) : null;

  const selected = new Set();
  let lockedExpiry = null;
  let lockTimerInterval = null;

  const tripSummary = document.getElementById('tripSummary');
  if (trip && bus && route) {
    tripSummary.textContent = bus.number + ' · ' + bus.type + ' · ' +
      route.from_city + ' → ' + route.to_city + ' · ' + trip.departure + '–' + trip.arrival + ' · ' + trip.trip_date;
  } else {
    tripSummary.textContent = 'Trip not found. Go back to the map and select a bus.';
  }

  const farePerKm = bus ? bus.fare_per_km : 1;
  const distance = route ? route.distance_km : 0;
  const baseFare = Math.round(distance * farePerKm);
  const reservationFee = 20;

  function fareForSeat() { return baseFare + reservationFee; }

  function renderGrid() {
    const grid = document.getElementById('seatGrid');
    if (!grid || !trip) return;
    const seats = window.DB.getSeats(tripId);
    grid.innerHTML = '';
    const isSleeper = (bus && bus.type === 'Airavat');
    grid.className = isSleeper ? 'seat-grid seat-grid--sleeper' : 'seat-grid seat-grid--seater';

    seats.forEach(function (s) {

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seat seat--' + s.status;
      btn.textContent = s.seat_no;
      btn.setAttribute('aria-label', 'Seat ' + s.seat_no + ' ' + s.status);
      btn.dataset.seat = s.seat_no;
      if (s.status === 'available') {
        btn.onclick = function () { toggleSeat(s.seat_no); };
      }
      if (selected.has(s.seat_no)) btn.classList.add('seat--selected');
      grid.appendChild(btn);
    });
    updateFare();
    renderPassengerForms();
  }

  function toggleSeat(sn) {
    if (selected.has(sn)) selected.delete(sn);
    else {
      if (selected.size >= 6) { alert('Maximum 6 seats per booking.'); return; }
      selected.add(sn);
    }
    renderGrid();
  }

  function updateFare() {

    const n = selected.size;
    const total = n * fareForSeat();
    document.getElementById('totalFare').textContent = total;
    const fareSummary = document.getElementById('fareSummary');
    if (fareSummary) {
      fareSummary.innerHTML =
        'Distance: ' + distance + ' km × ₹' + farePerKm + ' = ₹' + baseFare + ' per seat<br>' +
        'Reservation fee: ₹' + reservationFee + ' per seat<br>' +
        'Seats selected: ' + n + '<br>' +
        'Total: ₹' + total;
    }
    const proceed = document.getElementById('proceedBtn');
    proceed.disabled = (n === 0);
  }

  function renderPassengerForms() {
    const container = document.getElementById('passengerForms');
    if (!container) return;
    container.innerHTML = '';
    const arr = Array.from(selected).sort(function (a, b) { return parseInt(a) - parseInt(b); });
    arr.forEach(function (sn) {
      const div = document.createElement('div');
      div.style.marginBottom = '10px';
      div.innerHTML =
        '<p style="font-weight:700;margin:0 0 4px;">Seat ' + sn + '</p>' +
        '<div class="field"><label>Name</label><input data-seat="' + sn + '" data-field="name" required></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '  <div class="field"><label>Age</label><input data-seat="' + sn + '" data-field="age" type="number" min="1" max="120" required></div>' +
        '  <div class="field"><label>Gender</label><select data-seat="' + sn + '" data-field="gender"><option value="">Choose</option><option>Male</option><option>Female</option><option>Other</option></select></div>' +
        '</div>' +
        '<div class="field"><label>Phone</label><input data-seat="' + sn + '" data-field="phone" type="tel" required></div>';
      container.appendChild(div);
    });
  }

  function collectPassengers() {
    const arr = Array.from(selected).sort(function (a, b) { return parseInt(a) - parseInt(b); });
    const out = [];
    let ok = true;
    arr.forEach(function (sn) {
      const name = document.querySelector('input[data-seat="' + sn + '"][data-field="name"]').value.trim();
      const age = document.querySelector('input[data-seat="' + sn + '"][data-field="age"]').value.trim();
      const gender = document.querySelector('select[data-seat="' + sn + '"][data-field="gender"]').value;
      const phone = document.querySelector('input[data-seat="' + sn + '"][data-field="phone"]').value.trim();
      if (!name || !age || !gender || !phone) ok = false;
      out.push({ seatNo: sn, name: name, age: parseInt(age, 10), gender: gender, phone: phone });
    });
    return ok ? out : null;
  }

  // Auto-pick N seats together
  document.getElementById('autoPickBtn').addEventListener('click', function () {
    const seats = window.DB.getSeats(tripId);
    const available = seats.filter(function (s) { return s.status === 'available'; }).map(function (s) { return s.seat_no; });
    const picked = window.Graph.pickSeatsTogether(available, 2);
    if (!picked) { alert('Not enough adjacent seats.'); return; }
    picked.forEach(function (sn) { selected.add(sn); });
    renderGrid();
  });

  // Proceed to payment: lock seats first
  document.getElementById('proceedBtn').addEventListener('click', function () {
    const passengers = collectPassengers();
    if (!passengers) { alert('Please fill all passenger details.'); return; }
    const seatNos = Array.from(selected);
    const res = window.DB.lockSeats(tripId, seatNos);
    if (!res.ok) { alert(res.reason); renderGrid(); return; }
    lockedExpiry = res.expiry;
    startLockTimer();
    // store pending booking in sessionStorage
    sessionStorage.setItem('pendingBooking', JSON.stringify({
      tripId: tripId, passengers: passengers,
      totalFare: selected.size * fareForSeat(),
      expiry: lockedExpiry
    }));
    window.location.href = 'payment.html';
  });

  function startLockTimer() {
    const bar = document.getElementById('lockBar');
    bar.style.display = 'block';
    if (lockTimerInterval) clearInterval(lockTimerInterval);
    lockTimerInterval = setInterval(function () {
      const remaining = Math.max(0, lockedExpiry - Date.now());
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      document.getElementById('lockTimer').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (remaining <= 0) {
        clearInterval(lockTimerInterval);
        alert('Seat lock expired. Please try again.');
        window.location.href = 'map.html';
      }
    }, 1000);
  }

  // On load, release expired locks
  if (tripId) window.DB.releaseExpiredLocks(tripId);

  // Check for existing lock from sessionStorage
  const pending = sessionStorage.getItem('pendingBooking');
  if (pending) {
    try {
      const p = JSON.parse(pending);
      if (p.tripId === tripId && p.expiry > Date.now()) {
        lockedExpiry = p.expiry;
        p.passengers.forEach(function (ps) { selected.add(ps.seatNo); });
        startLockTimer();
      } else {
        sessionStorage.removeItem('pendingBooking');
      }
    } catch (e) { sessionStorage.removeItem('pendingBooking'); }
  }

  if (trip) renderGrid();
})();
