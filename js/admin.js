/* ============================================================
   NammaBus - admin.js  (Phase 2B)
   ============================================================ */

(function () {
  'use strict';

  function renderTables() {
    const busTable = document.getElementById('busTable');
    const routeTable = document.getElementById('routeTable');
    const bookingTable = document.getElementById('bookingTable');

    const buses = window.DB.getBuses();
    busTable.innerHTML = buses.map(function (b) {
      return '<div>' + b.number + ' · ' + b.type + ' · ' + b.total_seats + ' seats · ₹' + b.fare_per_km + '/km</div>';
    }).join('') || '<div style="color:var(--muted);">No buses.</div>';

    const routes = window.DB.getRoutes();
    routeTable.innerHTML = routes.map(function (r) {
      return '<div>' + r.id + ' · ' + r.from_city + ' → ' + r.to_city + ' · ' + r.distance_km + ' km</div>';
    }).join('') || '<div style="color:var(--muted);">No routes.</div>';

    const bookings = window.DB.getBookings();
    bookingTable.innerHTML = bookings.map(function (b) {
      return '<div>' + b.id + ' · ' + b.status + ' · ₹' + b.total_fare + '</div>';
    }).join('') || '<div style="color:var(--muted);">No bookings.</div>';
  }

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!confirm('Reset all demo data? This clears bookings too.')) return;
    window.DB.resetDemo();
    renderTables();
    alert('Demo data reset.');
  });

  document.getElementById('addBus').addEventListener('click', function () {
    const num = document.getElementById('bNum').value.trim();
    const type = document.getElementById('bType').value;
    const seats = parseInt(document.getElementById('bSeats').value, 10);
    const fare = parseFloat(document.getElementById('bFare').value);
    if (!num) { alert('Enter bus number.'); return; }
    const id = window.DB.addBus({ number: num, type: type, total_seats: seats, fare_per_km: fare });
    alert('Bus added: ' + num + ' (' + id + ')');
    renderTables();
  });

  renderTables();
})();
