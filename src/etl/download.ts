import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DATA_ROOT } from './manifest';

// Extract stage for the Unfallatlas: its 9 yearly files total ~309 MB, so they
// are not versioned but downloaded on demand from the official source.
// The small Gemeindeverzeichnis + KBA files are bundled and need no download.

export const UNFALLATLAS_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const zipUrl = (year: number): string =>
  `https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte${year}_EPSG25832_CSV.zip`;

const LINREF_RE = /Unfallorte.*LinRef\.(txt|csv)$/i;

function hasYearFile(dir: string): boolean {
  return existsSync(dir) && readdirSync(dir).some((f) => LINREF_RE.test(f));
}

/**
 * Ensure every Unfallatlas year file is present under data/raw/unfallatlas/{year}/,
 * downloading + unzipping any that are missing. Already-present files are left
 * untouched (fast local dev). A failed download is logged, not fatal — the run
 * continues with whatever is available; missing files can be placed manually.
 */
export async function ensureUnfallatlasFiles(log: (msg: string) => void): Promise<void> {
  for (const year of UNFALLATLAS_YEARS) {
    const dir = join(DATA_ROOT, 'unfallatlas', String(year));
    if (hasYearFile(dir)) {
      log(`unfallatlas ${year}: vorhanden, kein Download.`);
      continue;
    }

    let buffer: Buffer;
    try {
      log(`unfallatlas ${year}: lade herunter …`);
      const res = await fetch(zipUrl(year));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      log(
        `unfallatlas ${year}: Download fehlgeschlagen (${(err as Error).message}). ` +
          `Bitte die Datei manuell unter data/raw/unfallatlas/${year}/ ablegen.`,
      );
      continue;
    }

    mkdirSync(dir, { recursive: true });
    const zip = new AdmZip(buffer);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const base = entry.entryName.split('/').pop() ?? entry.entryName;
      if (LINREF_RE.test(base) || /schema\.ini$/i.test(base)) {
        writeFileSync(join(dir, base), entry.getData());
      }
    }
    log(`unfallatlas ${year}: entpackt nach data/raw/unfallatlas/${year}/.`);
  }
}
