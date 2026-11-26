import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Static source manifest. The ETL does not crawl remote URLs; it knows which
// datasets exist and records provenance. "Detecting new sources" = a new year
// folder appearing under data/raw/unfallatlas/ + a manifest entry, tracked via
// import_runs.

export interface SourceDef {
  name: string;
  url: string;
  license: string | null;
  license_url: string | null;
  format: string;
}

export const SOURCES = {
  unfallatlas: {
    name: 'Unfallatlas (Unfallorte mit Personenschaden)',
    url: 'https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/',
    license: 'Datenlizenz Deutschland – Namensnennung 2.0',
    license_url: 'https://www.govdata.de/dl-de/by-2-0',
    format: 'CSV',
  } satisfies SourceDef,
  gemeindeverzeichnis: {
    name: 'Gemeindeverzeichnis (Auszug GV, Gebietsstand 31.12.2024)',
    url: 'https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html',
    license: 'Datenlizenz Deutschland – Namensnennung 2.0',
    license_url: 'https://www.govdata.de/dl-de/by-2-0',
    format: 'XLSX',
  } satisfies SourceDef,
  kba: {
    name: 'KBA FZ1 — Bestand an Personenkraftwagen nach Zulassungsbezirken',
    url: 'https://www.kba.de/DE/Statistik/Fahrzeuge/Bestand/bestand_node.html',
    license: 'Datenlizenz Deutschland – Namensnennung 2.0 (© Kraftfahrt-Bundesamt, Flensburg)',
    license_url: 'https://www.govdata.de/dl-de/by-2-0',
    format: 'XLSX',
  } satisfies SourceDef,
} as const;

export const DATA_ROOT = join(__dirname, '..', '..', 'data', 'raw');

export interface UnfallatlasFile {
  year: number;
  datasetKey: string; // e.g. 'unfallatlas:2023'
  path: string;
  mtime: Date;
}

export interface FileRef {
  path: string;
  mtime: Date;
}

export interface KbaFile extends FileRef {
  year: number;
  datasetKey: string; // 'kba:2023'
}

/** Locate the bundled Gemeindeverzeichnis XLSX (first .xlsx in its folder). */
export function discoverGemeindeverzeichnis(): FileRef | null {
  const dir = join(DATA_ROOT, 'gemeindeverzeichnis');
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => /\.xlsx$/i.test(f));
  if (!file) return null;
  const path = join(dir, file);
  return { path, mtime: statSync(path).mtime };
}

/** Locate the bundled KBA FZ1 files (fz1_YYYY.xlsx). */
export function discoverKbaFiles(): KbaFile[] {
  const dir = join(DATA_ROOT, 'kba');
  if (!existsSync(dir)) return [];
  const out: KbaFile[] = [];
  for (const f of readdirSync(dir)) {
    const m = /fz1_(\d{4})\.xlsx$/i.exec(f);
    if (!m) continue;
    const path = join(dir, f);
    const year = Number.parseInt(m[1], 10);
    out.push({ year, datasetKey: `kba:${year}`, path, mtime: statSync(path).mtime });
  }
  return out.sort((a, b) => a.year - b.year);
}

/** Discover all Unfallatlas year files present on disk (.txt or .csv). */
export function discoverUnfallatlasFiles(): UnfallatlasFile[] {
  const root = join(DATA_ROOT, 'unfallatlas');
  if (!existsSync(root)) return [];
  const out: UnfallatlasFile[] = [];
  for (const entry of readdirSync(root)) {
    const yearDir = join(root, entry);
    if (!statSync(yearDir).isDirectory()) continue;
    const year = Number.parseInt(entry, 10);
    if (!Number.isFinite(year)) continue;
    const dataFile = readdirSync(yearDir).find(
      (f) => /Unfallorte.*LinRef\.(txt|csv)$/i.test(f),
    );
    if (!dataFile) continue;
    const path = join(yearDir, dataFile);
    out.push({ year, datasetKey: `unfallatlas:${year}`, path, mtime: statSync(path).mtime });
  }
  return out.sort((a, b) => a.year - b.year);
}
