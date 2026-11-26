import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { Kysely } from 'kysely';
import { Database } from '../db/schema.types';
import { SourceDef } from './manifest';
import { BUNDESLAENDER } from './seed/bundeslaender';
import { AccidentRecord } from './sources/unfallatlas';
import { RegionRecord } from './sources/gemeindeverzeichnis';
import { PkwRecord } from './sources/kba';

const SCHEMA_PATH = join(__dirname, '..', '..', 'db', 'schema.sql');
const INSERT_CHUNK = 1000;

/** Apply db/schema.sql (idempotent). Uses a raw connection so multiple
 * statements run in a single simple-query call. */
export async function applySchema(pool: Pool): Promise<void> {
  const sqlText = readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(sqlText);
}

/** Full-rebuild reset: wipe all application data (keeps the schema). */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(
    `TRUNCATE accidents, indicator_values, indicators, import_runs, regions, sources
     RESTART IDENTITY CASCADE`,
  );
}

export async function upsertSource(
  db: Kysely<Database>,
  def: SourceDef,
  retrievedAt: Date | null,
): Promise<number> {
  const row = await db
    .insertInto('sources')
    .values({
      name: def.name,
      url: def.url,
      license: def.license,
      license_url: def.license_url,
      format: def.format,
      retrieved_at: retrievedAt,
    })
    .onConflict((oc) =>
      oc.column('name').doUpdateSet({
        url: def.url,
        license: def.license,
        license_url: def.license_url,
        format: def.format,
        retrieved_at: retrievedAt,
      }),
    )
    .returning('source_id')
    .executeTakeFirstOrThrow();
  return row.source_id;
}

export async function isDatasetLoaded(
  db: Kysely<Database>,
  datasetKey: string,
): Promise<boolean> {
  const row = await db
    .selectFrom('import_runs')
    .select('import_run_id')
    .where('dataset_key', '=', datasetKey)
    .where('finished_at', 'is not', null)
    .executeTakeFirst();
  return row !== undefined;
}

/** Remove a previously-imported dataset (accidents + its run rows) so a
 * re-import is clean. */
export async function clearDataset(db: Kysely<Database>, datasetKey: string): Promise<void> {
  const runs = await db
    .selectFrom('import_runs')
    .select('import_run_id')
    .where('dataset_key', '=', datasetKey)
    .execute();
  const ids = runs.map((r) => r.import_run_id);
  if (ids.length === 0) return;
  await db.deleteFrom('accidents').where('import_run_id', 'in', ids).execute();
  await db.deleteFrom('import_runs').where('import_run_id', 'in', ids).execute();
}

export async function startImportRun(
  db: Kysely<Database>,
  sourceId: number,
  datasetKey: string,
): Promise<number> {
  const row = await db
    .insertInto('import_runs')
    .values({ source_id: sourceId, dataset_key: datasetKey })
    .returning('import_run_id')
    .executeTakeFirstOrThrow();
  return row.import_run_id;
}

export async function finishImportRun(
  db: Kysely<Database>,
  runId: number,
  counts: { rowsIn: number; rowsLoaded: number; rowsRejected: number; notes?: string },
): Promise<void> {
  await db
    .updateTable('import_runs')
    .set({
      finished_at: new Date(),
      rows_in: counts.rowsIn,
      rows_loaded: counts.rowsLoaded,
      rows_rejected: counts.rowsRejected,
      notes: counts.notes ?? null,
    })
    .where('import_run_id', '=', runId)
    .execute();
}

/** Insert the synthetic country root (AGS '00' = Deutschland), idempotent. */
export async function seedCountry(db: Kysely<Database>): Promise<void> {
  await db
    .insertInto('regions')
    .values({ ags: '00', name: 'Deutschland', level: 'country', parent_region_id: null, population: null })
    .onConflict((oc) => oc.column('ags').doNothing())
    .execute();
}

/** Insert the 16 states if missing (idempotent on the unique AGS). */
export async function seedStates(db: Kysely<Database>): Promise<void> {
  await db
    .insertInto('regions')
    .values(
      BUNDESLAENDER.map((s) => ({
        ags: s.ags,
        name: s.name,
        level: 'state',
        parent_region_id: null,
        population: null,
      })),
    )
    .onConflict((oc) => oc.column('ags').doNothing())
    .execute();
}

/** Load the full region hierarchy from the Gemeindeverzeichnis (idempotent on AGS). */
export async function loadRegions(db: Kysely<Database>, regions: RegionRecord[]): Promise<number> {
  let loaded = 0;
  for (let i = 0; i < regions.length; i += INSERT_CHUNK) {
    const chunk = regions.slice(i, i + INSERT_CHUNK).map((r) => ({
      ags: r.ags,
      name: r.name,
      level: r.level,
      parent_region_id: null,
      population: r.population,
    }));
    await db
      .insertInto('regions')
      .values(chunk)
      .onConflict((oc) =>
        oc.column('ags').doUpdateSet((eb) => ({
          name: eb.ref('excluded.name'),
          level: eb.ref('excluded.level'),
          population: eb.ref('excluded.population'),
        })),
      )
      .execute();
    loaded += chunk.length;
  }
  return loaded;
}

/** Resolve parent_region_id by AGS prefix (municipality→district→state). */
export async function resolveRegionParents(pool: Pool): Promise<void> {
  await pool.query(`
    UPDATE regions c SET parent_region_id = p.region_id
    FROM regions p
    WHERE c.level = 'municipality' AND p.level = 'district' AND p.ags = left(c.ags, 5);
  `);
  await pool.query(`
    UPDATE regions c SET parent_region_id = p.region_id
    FROM regions p
    WHERE c.level = 'district' AND p.level = 'state' AND p.ags = left(c.ags, 2);
  `);
  await pool.query(`
    UPDATE regions c SET parent_region_id = p.region_id
    FROM regions p
    WHERE c.level = 'state' AND p.level = 'country';
  `);
}

/** Roll municipality population up to district and state level. */
export async function rollupPopulation(pool: Pool): Promise<void> {
  await pool.query(`
    UPDATE regions d SET population = sub.pop FROM (
      SELECT left(ags, 5) AS dags, sum(population) AS pop
      FROM regions WHERE level = 'municipality' AND population IS NOT NULL
      GROUP BY left(ags, 5)
    ) sub WHERE d.level = 'district' AND d.ags = sub.dags;
  `);
  await pool.query(`
    UPDATE regions s SET population = sub.pop FROM (
      SELECT left(ags, 2) AS sags, sum(population) AS pop
      FROM regions WHERE level = 'municipality' AND population IS NOT NULL
      GROUP BY left(ags, 2)
    ) sub WHERE s.level = 'state' AND s.ags = sub.sags;
  `);
  await pool.query(`
    UPDATE regions c SET population = sub.pop FROM (
      SELECT sum(population) AS pop FROM regions WHERE level = 'state' AND population IS NOT NULL
    ) sub WHERE c.level = 'country';
  `);
}

/** Ensure an indicator row exists; return its id. */
export async function ensureIndicator(
  db: Kysely<Database>,
  code: string,
  name: string,
  unit: string,
  sourceSystem: string,
): Promise<number> {
  const row = await db
    .insertInto('indicators')
    .values({ code, name, unit, source_system: sourceSystem })
    .onConflict((oc) =>
      oc.column('code').doUpdateSet({ name, unit, source_system: sourceSystem }),
    )
    .returning('indicator_id')
    .executeTakeFirstOrThrow();
  return row.indicator_id;
}

/** Load PKW counts as indicator_values at district level. Returns {loaded, orphans}. */
export async function loadPkwIndicator(
  db: Kysely<Database>,
  records: PkwRecord[],
  indicatorId: number,
  year: number,
  regionMap: Map<string, number>,
): Promise<{ loaded: number; orphans: number }> {
  let loaded = 0;
  let orphans = 0;
  const rows = records
    .map((r) => {
      const regionId = regionMap.get(r.districtAgs);
      if (regionId === undefined) {
        orphans++;
        return null;
      }
      return { region_id: regionId, indicator_id: indicatorId, year, value: r.pkw };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    await db
      .insertInto('indicator_values')
      .values(rows)
      .onConflict((oc) =>
        oc.columns(['region_id', 'indicator_id', 'year']).doUpdateSet((eb) => ({
          value: eb.ref('excluded.value'),
        })),
      )
      .execute();
    loaded = rows.length;
  }
  return { loaded, orphans };
}

export async function loadRegionMap(db: Kysely<Database>): Promise<Map<string, number>> {
  const rows = await db.selectFrom('regions').select(['ags', 'region_id']).execute();
  return new Map(rows.map((r) => [r.ags, r.region_id]));
}

/** Resolve to the finest region present: municipality → district → state. */
function resolveRegion(rec: AccidentRecord, map: Map<string, number>): number | null {
  return (
    map.get(rec.municipalityAgs) ??
    map.get(rec.districtAgs) ??
    map.get(rec.stateAgs) ??
    null
  );
}

export async function insertAccidents(
  db: Kysely<Database>,
  records: AccidentRecord[],
  regionMap: Map<string, number>,
  importRunId: number,
): Promise<{ loaded: number; orphans: number }> {
  let loaded = 0;
  let orphans = 0; // loaded, but AGS did not resolve to any known region

  const rows = records.map((r) => {
    const regionId = resolveRegion(r, regionMap);
    if (regionId === null) orphans++;
    return {
      uid: r.uid,
      year: r.year,
      month: r.month,
      hour: r.hour,
      weekday: r.weekday,
      category: r.category,
      type: r.type,
      light: r.light,
      is_bike: r.is_bike,
      is_car: r.is_car,
      is_foot: r.is_foot,
      is_motorbike: r.is_motorbike,
      is_truck: r.is_truck,
      is_other: r.is_other,
      lon: r.lon,
      lat: r.lat,
      region_id: regionId,
      import_run_id: importRunId,
    };
  });

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    await db.insertInto('accidents').values(chunk).execute();
    loaded += chunk.length;
  }
  return { loaded, orphans };
}
