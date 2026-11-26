import { Pool } from 'pg';
import { createDb } from '../db/db';
import { dbConnection } from '../config';
import { runPlausibilityChecks } from './checks';
import { ensureUnfallatlasFiles } from './download';
import {
  applySchema,
  clearDataset,
  ensureIndicator,
  finishImportRun,
  insertAccidents,
  isDatasetLoaded,
  loadPkwIndicator,
  loadRegionMap,
  loadRegions,
  resolveRegionParents,
  rollupPopulation,
  seedCountry,
  seedStates,
  startImportRun,
  truncateAll,
  upsertSource,
} from './load';
import {
  discoverGemeindeverzeichnis,
  discoverKbaFiles,
  discoverUnfallatlasFiles,
  SOURCES,
} from './manifest';
import { parseGemeindeverzeichnis } from './sources/gemeindeverzeichnis';
import { parseKbaFz1 } from './sources/kba';
import { parseUnfallatlasFile } from './sources/unfallatlas';

/**
 * ETL entry point (Extract → Parse → Map → Load → Aggregate).
 *   npm run etl              → full rebuild (wipe + load everything)
 *   npm run etl -- --update  → incremental (skip datasets already in import_runs)
 */
async function main(): Promise<void> {
  const update = process.argv.includes('--update');
  const pool = new Pool(dbConnection('owner'));
  const db = createDb('owner');

  try {
    await applySchema(pool);
    if (!update) {
      await truncateAll(pool);
      console.log('Full rebuild: all tables truncated.');
    }

    // ── Extract: download any missing Unfallatlas years (309 MB set is not bundled).
    await ensureUnfallatlasFiles((m) => console.log(m));

    // ── Region reference: load the full hierarchy from the Gemeindeverzeichnis.
    await seedCountry(db);
    const gvFile = discoverGemeindeverzeichnis();
    if (gvFile) {
      const gvSourceId = await upsertSource(db, SOURCES.gemeindeverzeichnis, gvFile.mtime);
      const runId = await startImportRun(db, gvSourceId, 'gemeindeverzeichnis');
      const regions = parseGemeindeverzeichnis(gvFile.path);
      const loaded = await loadRegions(db, regions);
      await resolveRegionParents(pool);
      await finishImportRun(db, runId, {
        rowsIn: regions.length,
        rowsLoaded: loaded,
        rowsRejected: 0,
        notes: 'Gemeindeverzeichnis: Bundesländer, Kreise, Gemeinden + Einwohner.',
      });
      console.log(`gemeindeverzeichnis: ${loaded} Regionen geladen.`);
    } else {
      console.warn('Gemeindeverzeichnis fehlt — fällt auf 16 Bundesländer zurück.');
      await seedStates(db);
    }

    // ── Unfallatlas: load accidents, resolving each to its finest region.
    const unfallFiles = discoverUnfallatlasFiles();
    const latestMtime = unfallFiles.reduce<Date | null>(
      (acc, f) => (acc === null || f.mtime > acc ? f.mtime : acc),
      null,
    );
    const unfallSourceId = await upsertSource(db, SOURCES.unfallatlas, latestMtime);
    let regionMap = await loadRegionMap(db);

    for (const file of unfallFiles) {
      if (update && (await isDatasetLoaded(db, file.datasetKey))) {
        console.log(`Skip ${file.datasetKey} (already loaded).`);
        continue;
      }
      await clearDataset(db, file.datasetKey);
      const runId = await startImportRun(db, unfallSourceId, file.datasetKey);
      const { records, rowsIn, rowsRejected } = parseUnfallatlasFile(file.path, file.year);
      const { loaded, orphans } = await insertAccidents(db, records, regionMap, runId);
      await finishImportRun(db, runId, {
        rowsIn,
        rowsLoaded: loaded,
        rowsRejected,
        notes: `Unfallatlas ${file.year}; orphan AGS (unresolved region): ${orphans}`,
      });
      console.log(
        `${file.datasetKey}: in=${rowsIn} loaded=${loaded} rejected=${rowsRejected} orphans=${orphans}`,
      );
    }

    // ── KBA: PKW counts as district-level indicator values.
    const kbaFiles = discoverKbaFiles();
    if (kbaFiles.length > 0) {
      const kbaSourceId = await upsertSource(db, SOURCES.kba, kbaFiles[kbaFiles.length - 1].mtime);
      const indicatorId = await ensureIndicator(
        db,
        'pkw_bestand',
        'Bestand an Personenkraftwagen',
        'Fahrzeuge',
        'KBA FZ1',
      );
      regionMap = await loadRegionMap(db);
      for (const file of kbaFiles) {
        if (update && (await isDatasetLoaded(db, file.datasetKey))) {
          console.log(`Skip ${file.datasetKey} (already loaded).`);
          continue;
        }
        const runId = await startImportRun(db, kbaSourceId, file.datasetKey);
        const records = parseKbaFz1(file.path);
        const { loaded, orphans } = await loadPkwIndicator(
          db,
          records,
          indicatorId,
          file.year,
          regionMap,
        );
        await finishImportRun(db, runId, {
          rowsIn: records.length,
          rowsLoaded: loaded,
          rowsRejected: orphans,
          notes: `KBA FZ1 ${file.year}; nicht zugeordnete Zulassungsbezirke: ${orphans}.`,
        });
        console.log(`${file.datasetKey}: in=${records.length} loaded=${loaded} orphans=${orphans}`);
      }
    }

    // ── Aggregate: roll municipality population up to district + state.
    await rollupPopulation(pool);

    // ── Plausibility checks.
    console.log('\nPlausibilitätsprüfungen:');
    const checks = await runPlausibilityChecks(pool);
    for (const c of checks) {
      console.log(`  [${c.ok ? 'OK ' : 'WARN'}] ${c.name}: ${c.detail}`);
    }

    console.log('\nETL finished.');
  } finally {
    await db.destroy();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
