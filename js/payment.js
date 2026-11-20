/* ============================================================
   NammaBus - payment.js  (Phase 2B)
   Demo payment form: validation, loading, success/failure.
   ============================================================ */

(function () {
  'use strict';

  const pending = sessionStorage.getItem('pendingBooking');
  if (!pending) { window.location.href = 'map.html'; return; }
  let booking;
  try { booking = JSON.parse(pending); } catch (e) { sessionStorage.removeItem('pendingBooking'); window.location.href = 'map.html'; return; }

  const summary = document.getElementById('summary');
  if (summary) summary.textContent = 'Amount to pay: ₹' + booking.totalFare + ' · ' + booking.passengers.length + ' seat(s).';

  const cardForm = document.getElementById('cardForm');
  const upiForm = document.getElementById('upiForm');
  const tabCard = document.getElementById('tabCard');
  const tabUpi = document.getElementById('tabUpi');

  function showCard() { cardForm.style.display = ''; upiForm.style.display = 'none'; tabCard.classList.add('btn--primary'); tabUpi.classList.remove('btn--primary'); }
  function showUpi() { cardForm.style.display = 'none'; upiForm.style.display = ''; tabUpi.classList.add('btn--primary'); tabCard.classList.remove('btn--primary'); }
  tabCard.addEventListener('click', showCard);
  tabUpi.addEventListener('click', showUpi);
  showCard();

  const payBtn = document.getElementById('payBtn');
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  function validate() {
    errorEl.textContent = '';
    if (cardForm.style.display !== 'none') {
      const num = document.getElementById('cardNum').value.replace(/\s/g, '');
      const exp = document.getElementById('cardExp').value.trim();
      const cvv = document.getElementById('cardCvv').value.trim();
      const name = document.getElementById('cardName').value.trim();
      if (!/^\d{16}$/.test(num)) { errorEl.textContent = 'Enter a 16-digit card number.'; return false; }
      if (!/^\d{2}\/\d{2}$/.test(exp)) { errorEl.textContent = 'Enter expiry as MM/YY.'; return false; }
      if (!/^\d{3}$/.test(cvv)) { errorEl.textContent = 'Enter a 3-digit CVV.'; return false; }
      if (!name) { errorEl.textContent = 'Enter name on card.'; return false; }
    } else {
      const upi = document.getElementById('upiId').value.trim();
      if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z]+$/.test(upi)) { errorEl.textContent = 'Enter a valid UPI ID.'; return false; }
    }
    return true;
  }

  payBtn.addEventListener('click', function () {
    if (!validate()) return;
    errorEl.textContent = '';
    payBtn.style.display = 'none';
    loading.style.display = 'block';

    // Simulate processing delay, then random success/failure
    setTimeout(function () {
      const success = Math.random() > 0.15;
      if (success) {
        const res = window.DB.confirmBooking({
          tripId: booking.tripId,
          passengerName: booking.passengers.map(function (p) { return p.name; }).join(', '),
          phone: booking.passengers[0].phone,
          seats: booking.passengers,
          totalFare: booking.totalFare
        });
        if (res.ok) {
          sessionStorage.removeItem('pendingBooking');
          window.location.href = 'ticket.html?booking=' + encodeURIComponent(res.bookingId);
        } else {
          loading.style.display = 'none';
          payBtn.style.display = '';
          errorEl.textContent = res.reason || 'Booking failed. Seats released.';
          window.DB.unlockSeats(booking.tripId, booking.passengers.map(function (p) { return p.seatNo; }));
        }
      } else {
        loading.style.display = 'none';
        payBtn.style.display = '';
        errorEl.textContent = 'Demo payment failed. Seats released. Try again.';
        window.DB.unlockSeats(booking.tripId, booking.passengers.map(function (p) { return p.seatNo; }));
      }
    }, 1800);
  });
})();
