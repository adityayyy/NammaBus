/* ============================================================
   NammaBus - bookings.js  (Phase 2B)
   Upcoming/past bookings, cancel with refund, track bus.
   ============================================================ */

(function () {
  'use strict';

  const upcoming = document.getElementById('upcoming');
  const past = document.getElementById('past');

  function render() {
    upcoming.innerHTML = '';
    past.innerHTML = '';
    const bookings = window.DB.getBookings();
    const now = Date.now();
    bookings.forEach(function (b) {
      const trip = window.DB.getTrip(b.trip_id);
      const bus = trip ? window.DB.getBus(trip.bus_id) : null;
      const route = trip ? window.DB.getRoute(trip.route_id) : null;
      const seats = window.DB.getBookingSeats(b.id);
      const tripDate = trip ? new Date(trip.trip_date + 'T' + trip.departure).getTime() : 0;
      const isPast = tripDate < now || b.status === 'cancelled';

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
        '<div><strong>' + b.id + '</strong> · ' + (bus ? bus.number + ' (' + bus.type + ')' : '') + '</div>' +
        '<span class="badge ' + (b.status === 'confirmed' ? 'badge--express' : 'badge--ordinary') + '">' + b.status + '</span></div>' +
        '<div style="color:var(--muted);font-size:0.85rem;margin-top:4px;">' +
        (route ? route.from_city + ' → ' + route.to_city : '') + ' · ' + (trip ? trip.departure + ' ' + trip.trip_date : '') + '</div>' +
        '<div style="font-size:0.85rem;margin-top:4px;">Seats: ' + seats.join(', ') + ' · ₹' + b.total_fare + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
        '<a class="btn btn--sm" href="ticket.html?booking=' + encodeURIComponent(b.id) + '">View ticket</a>' +
        '<a class="btn btn--sm" href="map.html?trip=' + encodeURIComponent(b.id) + '&follow=1">Track this bus</a>' +
        (b.status === 'confirmed' ? '<button class="btn btn--sm" data-cancel="' + b.id + '">Cancel</button>' : '') +
        '</div>';

      if (b.status === 'confirmed') {
        const cancelBtn = card.querySelector('button[data-cancel]');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function () {
            const hoursBefore = (tripDate - Date.now()) / 3600000;
            const pct = hoursBefore > 24 ? 90 : 50;
            const refund = Math.round(b.total_fare * pct / 100);
            if (!confirm('Cancel booking ' + b.id + '? Refund: ₹' + refund + ' (' + pct + '%).')) return;
            const res = window.DB.cancelBooking(b.id);
            if (res.ok) {
              alert('Cancelled. Refund: ₹' + res.refund + ' (' + Math.round(res.refundPct * 100) + '%).');
              render();
            } else alert(res.reason);
          });
        }
      }

      if (isPast) past.appendChild(card); else upcoming.appendChild(card);
    });

    if (!upcoming.children.length) upcoming.innerHTML = '<div class="empty-state">No upcoming bookings.</div>';
    if (!past.children.length) past.innerHTML = '<div class="empty-state">No past bookings.</div>';
  }

  render();
})();
