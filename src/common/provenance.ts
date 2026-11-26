import { db } from '../db/db';
import { SOURCES } from '../etl/manifest';

// Canonical source names (match the rows written by the ETL), so each endpoint
// can declare exactly which datasets contributed to its answer.
export const SOURCE = {
  unfallatlas: SOURCES.unfallatlas.name,
  gemeindeverzeichnis: SOURCES.gemeindeverzeichnis.name,
  kba: SOURCES.kba.name,
} as const;

// Provenance is returned with every response. For aggregates that draw on
// several datasets we return an array (one entry per contributing source).
export interface ProvenanceSource {
  name: string;
  url: string;
  license: string | null;
  license_url: string | null;
  retrieved_at: string | null;
}

export interface Envelope<T> {
  data: T;
  meta: { provenance: { sources: ProvenanceSource[] } };
}

/** Read contributing sources from the DB. If `names` is given, only those. */
export async function fetchSources(names?: string[]): Promise<ProvenanceSource[]> {
  let q = db
    .selectFrom('sources')
    .select(['name', 'url', 'license', 'license_url', 'retrieved_at']);
  if (names && names.length > 0) q = q.where('name', 'in', names);
  const rows = await q.execute();
  return rows.map((r) => ({
    name: r.name,
    url: r.url,
    license: r.license,
    license_url: r.license_url,
    retrieved_at: r.retrieved_at ? new Date(r.retrieved_at).toISOString() : null,
  }));
}

export function envelope<T>(data: T, sources: ProvenanceSource[]): Envelope<T> {
  return { data, meta: { provenance: { sources } } };
}
