-- Canonical schema for the integrated accident-data platform.
-- Idempotent (CREATE ... IF NOT EXISTS): the ETL applies this on every run.
-- Events / regions / indicators / provenance are cleanly separated.

-- ── Provenance ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  source_id    SERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  license      TEXT,
  license_url  TEXT,
  format       TEXT,
  retrieved_at TIMESTAMPTZ,
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS import_runs (
  import_run_id SERIAL PRIMARY KEY,
  source_id     INT  NOT NULL REFERENCES sources(source_id),
  dataset_key   TEXT NOT NULL,                 -- e.g. 'unfallatlas:2023' — unit of (re)import
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  rows_in       INT,
  rows_loaded   INT,
  rows_rejected INT,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS idx_import_runs_dataset_key ON import_runs(dataset_key);

-- ── Regions (hierarchy + population) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
  region_id        SERIAL PRIMARY KEY,
  ags              TEXT NOT NULL UNIQUE,        -- 2/5/8-digit Amtlicher Gemeindeschlüssel (string)
  name             TEXT NOT NULL,
  level            TEXT NOT NULL,               -- 'country' | 'state' | 'district' | 'municipality'
  parent_region_id INT REFERENCES regions(region_id),
  population       INT
);
-- FK index for hierarchy navigation (children of a region). `ags` is already
-- indexed via UNIQUE; the table is small (~11k rows), so `level` needs none.
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_region_id);

-- ── Accidents (point events) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accidents (
  accident_id   BIGSERIAL PRIMARY KEY,
  uid           TEXT,                           -- UIDENTSTLAE where present (NULL for 2016/2018/2019)
  year          SMALLINT NOT NULL,
  month         SMALLINT,
  hour          SMALLINT,
  weekday       SMALLINT,
  category      SMALLINT,                       -- 1 fatal, 2 serious injury, 3 light injury
  type          SMALLINT,                       -- UART
  light         SMALLINT,                       -- ULICHTVERH
  is_bike       BOOLEAN,
  is_car        BOOLEAN,
  is_foot       BOOLEAN,
  is_motorbike  BOOLEAN,
  is_truck      BOOLEAN,
  is_other      BOOLEAN,
  lon           DOUBLE PRECISION,
  lat           DOUBLE PRECISION,
  region_id     INT REFERENCES regions(region_id),
  import_run_id INT REFERENCES import_runs(import_run_id)
);
-- Indexes follow the general access paths, not individual queries:
--   region_id (+ year): FK / join to regions, region-scoped filters by year
--   year:               the most common standalone filter (statistics, listing)
--   import_run_id:      FK, used by the ETL's delete-then-insert re-import
-- Low-cardinality columns (category, is_* flags) get no index: they select
-- large fractions of the table, where a sequential scan is cheaper anyway.
CREATE INDEX IF NOT EXISTS idx_accidents_region_year ON accidents(region_id, year);
CREATE INDEX IF NOT EXISTS idx_accidents_year ON accidents(year);
CREATE INDEX IF NOT EXISTS idx_accidents_import_run ON accidents(import_run_id);

-- ── Indicators (external context: population-derived, PKW counts, …) ────────────
CREATE TABLE IF NOT EXISTS indicators (
  indicator_id  SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,           -- e.g. 'pkw_bestand'
  name          TEXT NOT NULL,
  unit          TEXT,
  source_system TEXT
);

CREATE TABLE IF NOT EXISTS indicator_values (
  region_id    INT      NOT NULL REFERENCES regions(region_id),
  indicator_id INT      NOT NULL REFERENCES indicators(indicator_id),
  year         SMALLINT NOT NULL,
  value        DOUBLE PRECISION,
  PRIMARY KEY (region_id, indicator_id, year)
);
