// Small parsing helpers for the German open-data CSV quirks.

/** Remove a leading UTF-8 byte-order mark if present. */
export function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Parse a German-formatted decimal ("10,148875" → 10.148875). */
export function parseGermanFloat(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Parse an integer field; empty/invalid → null. */
export function parseIntOrNull(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Unfallatlas participant flags are "0"/"1" strings. */
export function parseFlag(v: string | undefined): boolean | null {
  if (v == null || v.trim() === '') return null;
  const t = v.trim();
  if (t === '1') return true;
  if (t === '0') return false;
  return null;
}

/** Zero-pad a numeric region-key fragment to a fixed width (kept as string). */
export function zeroPad(v: string | undefined, width: number): string {
  return (v ?? '').trim().padStart(width, '0');
}
