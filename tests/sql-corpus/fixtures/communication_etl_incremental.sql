WITH bookings AS (
  SELECT created_at AT TIME ZONE 'UTC' AS created_utc
  FROM app.bookings
),
communication_logs AS (
  SELECT booking_id FROM bookings
),
crat AS (
  SELECT 1 AS ok FROM communication_logs
)
SELECT * FROM crat
