import { ColumnType, Generated } from 'kysely';

// Kysely table interfaces mirroring db/schema.sql.
// `Generated` marks DB-assigned columns (serial PKs, defaults).

export interface SourcesTable {
  source_id: Generated<number>;
  name: string;
  url: string;
  license: string | null;
  license_url: string | null;
  format: string | null;
  retrieved_at: ColumnType<Date, Date | string | null, Date | string | null> | null;
}

export interface ImportRunsTable {
  import_run_id: Generated<number>;
  source_id: number;
  dataset_key: string;
  started_at: Generated<Date>;
  finished_at: ColumnType<Date, Date | string | null, Date | string | null> | null;
  rows_in: number | null;
  rows_loaded: number | null;
  rows_rejected: number | null;
  notes: string | null;
}

export interface RegionsTable {
  region_id: Generated<number>;
  ags: string;
  name: string;
  level: string;
  parent_region_id: number | null;
  population: number | null;
}

export interface AccidentsTable {
  accident_id: Generated<number>;
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
  region_id: number | null;
  import_run_id: number | null;
}

export interface IndicatorsTable {
  indicator_id: Generated<number>;
  code: string;
  name: string;
  unit: string | null;
  source_system: string | null;
}

export interface IndicatorValuesTable {
  region_id: number;
  indicator_id: number;
  year: number;
  value: number | null;
}

export interface Database {
  sources: SourcesTable;
  import_runs: ImportRunsTable;
  regions: RegionsTable;
  accidents: AccidentsTable;
  indicators: IndicatorsTable;
  indicator_values: IndicatorValuesTable;
}
