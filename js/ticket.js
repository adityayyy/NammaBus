/* ============================================================
   NammaBus - ticket.js  (Phase 2B)
   Render ticket + deterministic QR-like pattern + print/PDF.
   ============================================================ */

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const bookingId = params.get('booking');
  const booking = bookingId ? window.DB.getBooking(bookingId) : null;

  const body = document.getElementById('ticketBody');
  if (!booking) {
    body.innerHTML = '<p style="color:var(--muted);">Booking not found.</p>';
    return;
  }
  const trip = window.DB.getTrip(booking.trip_id);
  const bus = trip ? window.DB.getBus(trip.bus_id) : null;
  const route = trip ? window.DB.getRoute(trip.route_id) : null;
  const passengers = window.DB.getPassengers(booking.id);
  const seats = window.DB.getBookingSeats(booking.id);

  body.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.9rem;">' +
    '<div><strong>Booking ID:</strong> ' + booking.id + '</div>' +
    '<div><strong>Status:</strong> ' + booking.status + '</div>' +
    '<div><strong>Route:</strong> ' + (route ? route.from_city + ' → ' + route.to_city : '—') + '</div>' +
    '<div><strong>Bus:</strong> ' + (bus ? bus.number + ' (' + bus.type + ')' : '—') + '</div>' +
    '<div><strong>Departure:</strong> ' + trip.departure + ' on ' + trip.trip_date + '</div>' +
    '<div><strong>Arrival:</strong> ' + trip.arrival + '</div>' +
    '<div><strong>Seats:</strong> ' + seats.join(', ') + '</div>' +
    '<div><strong>Total fare:</strong> ₹' + booking.total_fare + '</div>' +
    '</div>' +
    '<h3 style="margin:12px 0 6px;font-size:1rem;">Passengers</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
    '<tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:4px;">Seat</th><th style="text-align:left;padding:4px;">Name</th><th style="text-align:left;padding:4px;">Age</th><th style="text-align:left;padding:4px;">Gender</th></tr>' +
    passengers.map(function (p) { return '<tr style="border-bottom:1px solid var(--border);"><td style="padding:4px;">' + p.seat_no + '</td><td style="padding:4px;">' + p.name + '</td><td style="padding:4px;">' + p.age + '</td><td style="padding:4px;">' + p.gender + '</td></tr>'; }).join('') +
    '</table>';

  // Deterministic QR-like pattern from booking ID
  const canvas = document.getElementById('qr');
  const ctx = canvas.getContext('2d');
  const size = 120;
  const cells = 20;
  const cell = size / cells;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  // simple hash
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) hash = ((hash << 5) - hash + bookingId.charCodeAt(i)) | 0;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const v = (hash ^ (x * 31 + y * 17)) & 1;
      if (v) ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // finder squares
  function finder(ox, oy) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox, oy, 7 * cell, 7 * cell);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ox + cell, oy + cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox + 2 * cell, oy + 2 * cell, 3 * cell, 3 * cell);
  }
  finder(0, 0);
  finder(size - 7 * cell, 0);
  finder(0, size - 7 * cell);

  window.downloadPdf = function () { window.print(); };
})();
