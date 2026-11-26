// Load .env for local (non-Docker) runs. In Docker, compose injects the same
// variables and dotenv simply finds no file — process.env already wins.
// Credentials have no in-code defaults: .env (copied from .env.example) is the
// single source of truth.
import 'dotenv/config';

// Central runtime configuration, read from environment variables.
// Two DB roles: 'api' (SELECT-only, used by the web service) and
// 'owner' (owns schema + writes, used by the ETL). See db/init/00-roles.sh.

export type DbRole = 'api' | 'owner';

export interface DbConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function dbConnection(role: DbRole): DbConnection {
  const user = required(role === 'owner' ? 'DB_OWNER_USER' : 'DB_API_USER');
  const password = required(role === 'owner' ? 'DB_OWNER_PASSWORD' : 'DB_API_PASSWORD');

  return {
    host: required('DB_HOST', 'localhost'),
    port: Number(required('DB_PORT', '5432')),
    database: required('DB_NAME'),
    user,
    password,
  };
}

export const httpPort = Number(process.env.PORT ?? 3000);
