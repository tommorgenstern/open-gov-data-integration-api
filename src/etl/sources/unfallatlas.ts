import { readFileSync } from 'fs';
import {
  parseFlag,
  parseGermanFloat,
  parseIntOrNull,
  stripBom,
  zeroPad,
} from '../util';

// Canonical accident record produced from any Unfallatlas year, regardless of
// the per-year column drift. AGS fragments are pre-built at the three levels so
// the loader can resolve to the finest available region.
export interface AccidentRecord {
  uid: string | null;
  year: number;
  month: number | null;
  hour: number | null;
  weekday: number | null;
  category: number | null;
  type: number | null;
  light: number | null;
  is_bike: boolean | null;
  is_car: boolean | null;
  is_foot: boolean | null;
  is_motorbike: boolean | null;
  is_truck: boolean | null;
  is_other: boolean | null;
  lon: number | null;
  lat: number | null;
  stateAgs: string; // 2 digits
  districtAgs: string; // 5 digits
  municipalityAgs: string; // 8 digits
}

export interface ParseResult {
  records: AccidentRecord[];
  rowsIn: number;
  rowsRejected: number;
}

// Canonical field -> accepted header aliases across years (see PROJECT_PLAN_v2 drift table).
const ALIASES: Record<string, string[]> = {
  uid: ['UIDENTSTLAE', 'UIDENTSTLA'],
  uland: ['ULAND'],
  uregbez: ['UREGBEZ'],
  ukreis: ['UKREIS'],
  ugemeinde: ['UGEMEINDE'],
  year: ['UJAHR'],
  month: ['UMONAT'],
  hour: ['USTUNDE'],
  weekday: ['UWOCHENTAG'],
  category: ['UKATEGORIE'],
  type: ['UART'],
  light: ['ULICHTVERH', 'LICHT'],
  is_bike: ['IstRad'],
  is_car: ['IstPKW'],
  is_foot: ['IstFuss'],
  is_motorbike: ['IstKrad'],
  is_truck: ['IstGkfz'],
  is_other: ['IstSonstige', 'IstSonstig'],
  lon: ['XGCSWGS84'],
  lat: ['YGCSWGS84'],
};

type FieldMap = Record<keyof typeof ALIASES, number>;

function buildFieldMap(header: string[]): FieldMap {
  const cleaned = header.map((h) => h.trim());
  const map = {} as FieldMap;
  for (const [field, aliases] of Object.entries(ALIASES)) {
    map[field as keyof FieldMap] = cleaned.findIndex((h) => aliases.includes(h));
  }
  return map;
}

/**
 * Parse one Unfallatlas year file into canonical records.
 * Handles `;` separation, BOM, German decimals, and column drift.
 */
export function parseUnfallatlasFile(path: string, fallbackYear: number): ParseResult {
  const text = stripBom(readFileSync(path, 'utf8'));
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { records: [], rowsIn: 0, rowsRejected: 0 };

  const header = lines[0].split(';');
  const f = buildFieldMap(header);
  const records: AccidentRecord[] = [];
  let rowsIn = 0;
  let rowsRejected = 0;

  const at = (cols: string[], idx: number): string | undefined =>
    idx >= 0 ? cols[idx] : undefined;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    rowsIn++;
    const cols = line.split(';');

    const uland = zeroPad(at(cols, f.uland), 2);
    const uregbez = zeroPad(at(cols, f.uregbez), 1);
    const ukreis = zeroPad(at(cols, f.ukreis), 2);
    const ugemeinde = zeroPad(at(cols, f.ugemeinde), 3);
    const year = parseIntOrNull(at(cols, f.year)) ?? fallbackYear;

    // Mandatory key fragments must be present, else the row is unusable.
    if (uland === '00' || uland.length !== 2) {
      rowsRejected++;
      continue;
    }

    records.push({
      uid: f.uid >= 0 ? (at(cols, f.uid)?.trim() || null) : null,
      year,
      month: parseIntOrNull(at(cols, f.month)),
      hour: parseIntOrNull(at(cols, f.hour)),
      weekday: parseIntOrNull(at(cols, f.weekday)),
      category: parseIntOrNull(at(cols, f.category)),
      type: parseIntOrNull(at(cols, f.type)),
      light: parseIntOrNull(at(cols, f.light)),
      is_bike: parseFlag(at(cols, f.is_bike)),
      is_car: parseFlag(at(cols, f.is_car)),
      is_foot: parseFlag(at(cols, f.is_foot)),
      is_motorbike: parseFlag(at(cols, f.is_motorbike)),
      is_truck: parseFlag(at(cols, f.is_truck)),
      is_other: parseFlag(at(cols, f.is_other)),
      lon: parseGermanFloat(at(cols, f.lon)),
      lat: parseGermanFloat(at(cols, f.lat)),
      stateAgs: uland,
      districtAgs: uland + uregbez + ukreis,
      municipalityAgs: uland + uregbez + ukreis + ugemeinde,
    });
  }

  return { records, rowsIn, rowsRejected };
}
