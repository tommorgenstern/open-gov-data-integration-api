import { Pool } from 'pg';

// Plausibility checks run after loading. They return human-readable findings
// that the run prints and (optionally) persists; none are fatal, but they
// surface data-quality issues for the documentation.

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function scalar(pool: Pool, sql: string): Promise<number> {
  const res = await pool.query(sql);
  return Number(res.rows[0]?.n ?? 0);
}

export async function runPlausibilityChecks(pool: Pool): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Reconciliation: rows_in must equal rows_loaded + rows_rejected per run.
  const badRuns = await pool.query(`
    SELECT dataset_key, rows_in, rows_loaded, rows_rejected
    FROM import_runs
    WHERE finished_at IS NOT NULL
      AND rows_in IS DISTINCT FROM (coalesce(rows_loaded,0) + coalesce(rows_rejected,0))
  `);
  results.push({
    name: 'row-count-reconciliation',
    ok: badRuns.rowCount === 0,
    detail:
      badRuns.rowCount === 0
        ? 'Alle Importläufe: rows_in = rows_loaded + rows_rejected.'
        : `Abweichung bei: ${badRuns.rows.map((r) => r.dataset_key).join(', ')}`,
  });

  // 2. Orphan accidents: every accident should resolve to a region.
  const orphans = await scalar(pool, `SELECT count(*) AS n FROM accidents WHERE region_id IS NULL`);
  results.push({
    name: 'orphan-accidents',
    ok: orphans === 0,
    detail: `${orphans} Unfälle ohne zugeordnete Region (region_id IS NULL).`,
  });

  // 3. Value domains.
  const badCategory = await scalar(
    pool,
    `SELECT count(*) AS n FROM accidents WHERE category IS NOT NULL AND category NOT IN (1,2,3)`,
  );
  const badMonth = await scalar(
    pool,
    `SELECT count(*) AS n FROM accidents WHERE month IS NOT NULL AND (month < 1 OR month > 12)`,
  );
  const badHour = await scalar(
    pool,
    `SELECT count(*) AS n FROM accidents WHERE hour IS NOT NULL AND (hour < 0 OR hour > 23)`,
  );
  results.push({
    name: 'value-domains',
    ok: badCategory === 0 && badMonth === 0 && badHour === 0,
    detail: `category∉{1,2,3}: ${badCategory}, month∉1..12: ${badMonth}, hour∉0..23: ${badHour}.`,
  });

  // 4. Coordinates within Germany's bounding box (where present).
  const badCoords = await scalar(
    pool,
    `SELECT count(*) AS n FROM accidents
     WHERE lon IS NOT NULL AND lat IS NOT NULL
       AND (lon < 5.5 OR lon > 15.5 OR lat < 47.0 OR lat > 55.5)`,
  );
  results.push({
    name: 'coordinate-bounding-box',
    ok: badCoords === 0,
    detail: `${badCoords} Unfälle mit Koordinaten außerhalb Deutschlands.`,
  });

  // 5. Coverage sanity: how many years and regions are present.
  const years = await scalar(pool, `SELECT count(DISTINCT year) AS n FROM accidents`);
  const municipalities = await scalar(
    pool,
    `SELECT count(*) AS n FROM regions WHERE level = 'municipality'`,
  );
  results.push({
    name: 'coverage',
    ok: years > 0 && municipalities > 0,
    detail: `${years} Unfalljahre, ${municipalities} Gemeinden in der Regionsreferenz.`,
  });

  return results;
}
