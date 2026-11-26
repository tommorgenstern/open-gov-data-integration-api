import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { db } from '../db/db';
import { RegionsQueryDto } from './dto/regions-query.dto';

export interface RegionSummary {
  ags: string;
  name: string;
  level: string;
  population: number | null;
  parent_ags: string | null;
}

export interface RegionDetail extends RegionSummary {
  data_coverage: { earliest_year: number | null; latest_year: number | null };
}

@Injectable()
export class RegionsService {
  async list(query: RegionsQueryDto): Promise<RegionSummary[]> {
    let parentId: number | null | undefined;
    if (query.parent) {
      const parent = await db
        .selectFrom('regions')
        .select('region_id')
        .where('ags', '=', query.parent)
        .executeTakeFirst();
      if (!parent) return []; // unknown parent → no children
      parentId = parent.region_id;
    }

    let q = db
      .selectFrom('regions as r')
      .leftJoin('regions as p', 'p.region_id', 'r.parent_region_id')
      .select(['r.ags as ags', 'r.name as name', 'r.level as level', 'r.population as population', 'p.ags as parent_ags']);

    if (query.level) q = q.where('r.level', '=', query.level);
    if (query.q) q = q.where('r.name', 'ilike', `%${query.q}%`);
    if (parentId != null) q = q.where('r.parent_region_id', '=', parentId);

    return q
      .orderBy('r.ags')
      .limit(query.limit ?? 100)
      .offset(query.offset ?? 0)
      .execute();
  }

  /** A single region plus the year range of accidents it covers. */
  async getByAgs(ags: string): Promise<RegionDetail | null> {
    const region = await db
      .selectFrom('regions as r')
      .leftJoin('regions as p', 'p.region_id', 'r.parent_region_id')
      .select(['r.ags as ags', 'r.name as name', 'r.level as level', 'r.population as population', 'p.ags as parent_ags'])
      .where('r.ags', '=', ags)
      .executeTakeFirst();
    if (!region) return null;

    // Country aggregates over all accidents; other levels match by AGS prefix.
    const prefixLen = region.level === 'country' ? 0 : region.ags.length;
    const coverage = await sql<{ earliest: number | null; latest: number | null }>`
      SELECT min(a.year) AS earliest, max(a.year) AS latest
      FROM accidents a
      JOIN regions ar ON ar.region_id = a.region_id
      ${prefixLen > 0 ? sql`WHERE left(ar.ags, ${prefixLen}) = ${region.ags}` : sql``}
    `.execute(db);

    const row = coverage.rows[0];
    return {
      ...region,
      data_coverage: { earliest_year: row?.earliest ?? null, latest_year: row?.latest ?? null },
    };
  }
}
