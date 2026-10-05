WITH pools AS (
  SELECT pool_date
  FROM app.uri_pool
  WHERE {pool_date_filter}
)
SELECT * FROM pools
