import { Injectable } from '@nestjs/common';
import { db } from '../db/db';

@Injectable()
export class MetadataService {
  listSources() {
    return db
      .selectFrom('sources')
      .select(['source_id', 'name', 'url', 'license', 'license_url', 'format', 'retrieved_at'])
      .orderBy('source_id')
      .execute();
  }

  getSource(id: number) {
    return db
      .selectFrom('sources')
      .select(['source_id', 'name', 'url', 'license', 'license_url', 'format', 'retrieved_at'])
      .where('source_id', '=', id)
      .executeTakeFirst();
  }

  listImportRuns() {
    return db
      .selectFrom('import_runs')
      .innerJoin('sources', 'sources.source_id', 'import_runs.source_id')
      .select([
        'import_run_id',
        'import_runs.source_id as source_id',
        'sources.name as source_name',
        'sources.url as source_url',
        'sources.license as license',
        'sources.license_url as license_url',
        'dataset_key',
        'started_at',
        'finished_at',
        'rows_in',
        'rows_loaded',
        'rows_rejected',
        'notes',
      ])
      .orderBy('import_run_id')
      .execute();
  }

  getImportRun(id: number) {
    return db
      .selectFrom('import_runs')
      .innerJoin('sources', 'sources.source_id', 'import_runs.source_id')
      .select([
        'import_run_id',
        'import_runs.source_id as source_id',
        'sources.name as source_name',
        'sources.url as source_url',
        'sources.license as license',
        'sources.license_url as license_url',
        'dataset_key',
        'started_at',
        'finished_at',
        'rows_in',
        'rows_loaded',
        'rows_rejected',
        'notes',
      ])
      .where('import_run_id', '=', id)
      .executeTakeFirst();
  }
}
