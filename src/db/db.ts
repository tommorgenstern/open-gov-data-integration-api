import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './schema.types';
import { dbConnection, DbRole } from '../config';

// Build a Kysely instance for the given role. Kysely compiles every query to
// parameterized SQL, so user input is never string-interpolated.
export function createDb(role: DbRole): Kysely<Database> {
  const pool = new Pool(dbConnection(role));
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

// Shared API-role (read-only) instance used by the NestJS application.
export const db = createDb('api');
