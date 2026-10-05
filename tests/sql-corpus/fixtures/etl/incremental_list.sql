WITH base AS (
  SELECT id FROM {{SCHEMA_NAME}}.booking_etl
),
touched_parents AS (
  SELECT * FROM base
),
keys AS (
  SELECT * FROM touched_parents
)
SELECT * FROM keys
