-- Tarpit rollup schema -- the UPSERT version.
--
-- `tarpit_log` keeps one row per probe. `tarpit_rollup` keeps one row per
-- (site, type, ip, hour) tuple with a `count` that increments on repeats.
-- Same information at dashboard-aggregate resolution, bounded storage,
-- and schema-ready for the option-2 DO aggregation layer.
--
-- Apply with: wrangler d1 execute tarpit-logs --file=schema-rollup.sql

CREATE TABLE IF NOT EXISTS tarpit_rollup (
  site        TEXT NOT NULL,
  type        TEXT NOT NULL,
  ip          TEXT NOT NULL,
  hour_bucket TEXT NOT NULL,  -- e.g. '2026-04-24 21:00:00' (UTC)
  count       INTEGER NOT NULL DEFAULT 1,
  first_ts    DATETIME NOT NULL,
  last_ts     DATETIME NOT NULL,
  path        TEXT DEFAULT '',
  ua          TEXT DEFAULT '',
  country     TEXT DEFAULT '',
  data        TEXT DEFAULT '',
  PRIMARY KEY (site, type, ip, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_rollup_hour ON tarpit_rollup(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_rollup_site ON tarpit_rollup(site);
CREATE INDEX IF NOT EXISTS idx_rollup_type ON tarpit_rollup(type);
