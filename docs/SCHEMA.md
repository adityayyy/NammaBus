# NammaBus — Database Schema

See the full CREATE TABLE statements in `js/db.js` (top comment block).
Tables: cities, routes, route_stops, buses, trips, seats, bookings, passengers, booking_seats.

## Transaction idea (seat booking)
To make double-booking impossible, `confirmBooking` checks that every seat is
either `available` or `locked` before writing, then marks them `booked` in the
same synchronous block. In real SQL this would be wrapped in:

```sql
BEGIN TRANSACTION;
SELECT status FROM seats WHERE trip_id=? AND seat_no=? FOR UPDATE;
-- if any not available/locked -> ROLLBACK
UPDATE seats SET status='booked', locked_until=NULL WHERE ...;
INSERT INTO bookings ...;
INSERT INTO passengers ...;
COMMIT;
```

The 5-minute lock (`lockSeats`) sets `status='locked'` with `locked_until`,
and `releaseExpiredLocks` reverts expired locks to `available` on every read.
