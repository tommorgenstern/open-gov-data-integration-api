import * as XLSX from 'xlsx';
import { zeroPad } from '../util';

// Parses the DESTATIS Gemeindeverzeichnis ("Auszug GV"). It yields the full
// region hierarchy with population, keyed by 8-digit AGS components:
//   Satzart 10 = Bundesland (state)      ARS: Land
//   Satzart 40 = Kreis (district)        ARS: Land+RB+Kreis  (5 digits)
//   Satzart 60 = Gemeinde (municipality) ARS: Land+RB+Kreis+Gem (8 digits)
// (Satzart 50 = Gemeindeverband is skipped.)

export type RegionLevel = 'state' | 'district' | 'municipality';

export interface RegionRecord {
  ags: string;
  name: string;
  level: RegionLevel;
  population: number | null;
}

const SHEET = 'Onlineprodukt_Gemeinden31122024';

// 0-indexed columns (see inspection of the sheet).
const COL = { satzart: 0, land: 2, rb: 3, kreis: 4, gem: 6, name: 7, population: 9 } as const;

function toInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number.parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseGemeindeverzeichnis(path: string): RegionRecord[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${path}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  const out: RegionRecord[] = [];
  for (const row of rows) {
    const satzart = row[COL.satzart] == null ? '' : String(row[COL.satzart]).trim();
    const name = row[COL.name] == null ? '' : String(row[COL.name]).trim();
    if (!name) continue;

    const land = zeroPad(row[COL.land] != null ? String(row[COL.land]) : '', 2);
    const rb = zeroPad(row[COL.rb] != null ? String(row[COL.rb]) : '', 1);
    const kreis = zeroPad(row[COL.kreis] != null ? String(row[COL.kreis]) : '', 2);
    const gem = zeroPad(row[COL.gem] != null ? String(row[COL.gem]) : '', 3);
    const population = toInt(row[COL.population]);

    if (satzart === '10') {
      out.push({ ags: land, name, level: 'state', population });
    } else if (satzart === '40') {
      out.push({ ags: land + rb + kreis, name, level: 'district', population });
    } else if (satzart === '60') {
      out.push({ ags: land + rb + kreis + gem, name, level: 'municipality', population });
    }
  }
  return out;
}
