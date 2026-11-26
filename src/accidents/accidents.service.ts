import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { db } from '../db/db';
import { PARTICIPANT_COL } from '../common/query-maps';
import { AccidentsQueryDto } from './dto/accidents-query.dto';

export interface AccidentRow {
  accident_id: number;
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
  region_ags: string;
  region_name: string;
}

const DEFAULT_LIMIT = 50;

@Injectable()
export class AccidentsService {
  /** Individual accident events with filters + pagination. */
  async list(q: AccidentsQueryDto): Promise<AccidentRow[]> {
    const conds = [];
    if (q.region) conds.push(sql`left(ar.ags, ${q.region.length}) = ${q.region}`);
    if (q.year != null) conds.push(sql`a.year = ${q.year}`);
    if (q.month != null) conds.push(sql`a.month = ${q.month}`);
    if (q.weekday != null) conds.push(sql`a.weekday = ${q.weekday}`);
    if (q.hour != null) conds.push(sql`a.hour = ${q.hour}`);
    if (q.category != null) conds.push(sql`a.category = ${q.category}`);
    if (q.participant) conds.push(sql`${sql.ref('a.' + PARTICIPANT_COL[q.participant])} = true`);

    const where = conds.length > 0 ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;
    const limit = q.limit ?? DEFAULT_LIMIT;
    const offset = q.offset ?? 0;

    const query = sql<AccidentRow>`
      -- BIGINT comes back from pg as a string; ids fit safely into a JS number.
      SELECT a.accident_id::int AS accident_id, a.year, a.month, a.hour, a.weekday, a.category, a.type, a.light,
             a.is_bike, a.is_car, a.is_foot, a.is_motorbike, a.is_truck, a.is_other,
             a.lon, a.lat, ar.ags AS region_ags, ar.name AS region_name
      FROM accidents a
      JOIN regions ar ON ar.region_id = a.region_id
      ${where}
      ORDER BY a.accident_id
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await query.execute(db);
    return result.rows;
  }
}
