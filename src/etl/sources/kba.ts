import * as XLSX from 'xlsx';

// Parses KBA FZ1.1 (Bestand an Kraftfahrzeugen nach Zulassungsbezirken).
// Column positions drift between years (the 2022 file has an extra leading
// empty column vs. 2023), so columns are detected by header text rather than
// hardcoded: the "Statistische Kennziffer und Zulassungsbezirk" column holds
// "<5-digit Kennziffer> <name>"; the "Personenkraftwagen" block's first column
// is the PKW total. The Kennziffer ≈ 5-digit district AGS (Zulassungsbezirk ≈
// Kreis, not strictly 1:1).

export interface PkwRecord {
  districtAgs: string; // 5-digit
  name: string;
  pkw: number;
}

const SHEET = 'FZ1.1';
const KEY_RE = /^(\d{5})\s+(.*)$/;

function cellText(v: unknown): string {
  return v == null ? '' : String(v).replace(/\s+/g, ' ').trim();
}

export function parseKbaFz1(path: string): PkwRecord[] {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${path}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  // Locate the header row (key column) and the PKW total column (the
  // "Personenkraftwagen" block header sits one row above the header row).
  let keyCol = -1;
  let pkwCol = -1;
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const k = row.findIndex((c) => cellText(c) === 'Statistische Kennziffer und Zulassungsbezirk');
    if (k >= 0) {
      keyCol = k;
      headerRow = i;
      const above = rows[i - 1] ?? [];
      pkwCol = above.findIndex((c) => /Personenkraftwagen/i.test(cellText(c)));
      break;
    }
  }
  if (keyCol < 0 || pkwCol < 0) {
    throw new Error(`Could not locate KBA columns in ${path} (keyCol=${keyCol}, pkwCol=${pkwCol})`);
  }

  const out: PkwRecord[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const m = KEY_RE.exec(cellText(row[keyCol]));
    if (!m) continue; // skip Land/RB subtotals and the grand total
    const raw = row[pkwCol];
    const pkw = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(pkw)) continue;
    out.push({ districtAgs: m[1], name: m[2].trim(), pkw });
  }
  return out;
}
