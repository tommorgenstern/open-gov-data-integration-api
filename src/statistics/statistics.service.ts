import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'kysely';
import { db } from '../db/db';
import { LEVEL_LEN, PARTICIPANT_COL } from '../common/query-maps';
import { Level, Per, SortKey, StatisticsQueryDto } from './dto/statistics-query.dto';

export interface RegionStat {
  ags: string;
  name: string;
  count: number;
  denominator?: number | null;
  rate?: number | null; // per 100,000 of the chosen denominator
}

@Injectable()
export class StatisticsService {
  /**
   * Aggregated accident counts per region at the requested level, optionally as
   * a rate per 100,000 (population or registered PKW).
   *
   * Starts from the COMPLETE region reference and LEFT JOINs accidents, so
   * regions with zero accidents are preserved (enables maxCount=0 / zero-cases).
   */
  async regionStatistics(q: StatisticsQueryDto): Promise<RegionStat[]> {
    const len = LEVEL_LEN[q.level];

    // PKW rates are only meaningful at district level and need a year (KBA is
    // a per-year, per-Zulassungsbezirk figure).
    if (q.per === Per.pkw && (q.level !== Level.district || q.year == null)) {
      throw new UnprocessableEntityException(
        'per=pkw ist nur auf Kreisebene (level=district) mit Angabe eines Jahres möglich.',
      );
    }
    if ((q.sort === SortKey.rateAsc || q.sort === SortKey.rateDesc) && !q.per) {
      throw new UnprocessableEntityException('Sortierung nach rate erfordert den Parameter per.');
    }

    const joinConds = [sql`left(sub.source_ags, ${len}) = r.ags`];
    if (q.year != null) joinConds.push(sql`sub.year = ${q.year}`);
    if (q.category != null) joinConds.push(sql`sub.category = ${q.category}`);
    if (q.participant) {
      joinConds.push(sql`${sql.ref('sub.' + PARTICIPANT_COL[q.participant])} = true`);
    }

    // Optional denominator + rate.
    let rateSelect = sql``;
    let pkwJoin = sql``;
    let groupExtra = sql``;
    if (q.per === Per.population) {
      rateSelect = sql`, r.population AS denominator,
        round(count(sub.accident_id)::numeric / nullif(r.population, 0)::numeric * 100000, 2)::float8 AS rate`;
    } else if (q.per === Per.pkw) {
      const pkw = await db
        .selectFrom('indicators')
        .select('indicator_id')
        .where('code', '=', 'pkw_bestand')
        .executeTakeFirst();
      const pkwId = pkw?.indicator_id ?? -1;
      pkwJoin = sql`LEFT JOIN indicator_values iv
        ON iv.region_id = r.region_id AND iv.indicator_id = ${pkwId} AND iv.year = ${q.year}`;
      rateSelect = sql`, iv.value AS denominator,
        round(count(sub.accident_id)::numeric / nullif(iv.value, 0)::numeric * 100000, 2)::float8 AS rate`;
      groupExtra = sql`, iv.value`;
    }

    const whereConds = [sql`r.level = ${q.level}`];
    if (q.parent) whereConds.push(sql`left(r.ags, ${q.parent.length}) = ${q.parent}`);

    const havingConds = [];
    if (q.minCount != null) havingConds.push(sql`count(sub.accident_id) >= ${q.minCount}`);
    if (q.maxCount != null) havingConds.push(sql`count(sub.accident_id) <= ${q.maxCount}`);

    const orderBy =
      q.sort === SortKey.countAsc
        ? sql`cnt ASC, r.ags ASC`
        : q.sort === SortKey.agsAsc
          ? sql`r.ags ASC`
          : q.sort === SortKey.agsDesc
            ? sql`r.ags DESC`
            : q.sort === SortKey.rateAsc
              ? sql`rate ASC NULLS LAST, r.ags ASC`
              : q.sort === SortKey.rateDesc
                ? sql`rate DESC NULLS LAST, r.ags ASC`
                : sql`cnt DESC, r.ags ASC`;

    const query = sql<{
      ags: string;
      name: string;
      cnt: number;
      denominator: number | null;
      rate: number | null;
    }>`
      SELECT r.ags AS ags, r.name AS name, count(sub.accident_id)::int AS cnt ${rateSelect}
      FROM regions r
      ${pkwJoin}
      LEFT JOIN (
        SELECT a.accident_id, a.year, a.category,
               a.is_bike, a.is_car, a.is_foot, a.is_motorbike, a.is_truck, a.is_other,
               ar.ags AS source_ags
        FROM accidents a
        JOIN regions ar ON ar.region_id = a.region_id
      ) sub ON ${sql.join(joinConds, sql` AND `)}
      WHERE ${sql.join(whereConds, sql` AND `)}
      GROUP BY r.region_id, r.ags, r.name, r.population ${groupExtra}
      ${havingConds.length > 0 ? sql`HAVING ${sql.join(havingConds, sql` AND `)}` : sql``}
      ORDER BY ${orderBy}
      ${q.limit != null ? sql`LIMIT ${q.limit}` : sql``}
      ${q.offset != null && q.offset > 0 ? sql`OFFSET ${q.offset}` : sql``}
    `;

    const result = await query.execute(db);
    return result.rows.map((row) => {
      const stat: RegionStat = { ags: row.ags, name: row.name, count: row.cnt };
      if (q.per) {
        stat.denominator = row.denominator;
        stat.rate = row.rate;
      }
      return stat;
    });
  }
}
