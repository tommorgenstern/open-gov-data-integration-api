#!/bin/sh
# Runs once on first DB init (Postgres entrypoint). Creates the least-privilege
# API role using the credentials supplied via the db service environment, so all
# config lives in a single place (.env). The ETL connects as the owner
# (POSTGRES_USER); the web service connects as the read-only API role.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
  CREATE ROLE ${DB_API_USER} LOGIN PASSWORD '${DB_API_PASSWORD}';
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${DB_API_USER};
  GRANT USAGE ON SCHEMA public TO ${DB_API_USER};
  -- Tables the owner creates later are auto-granted SELECT to the API role.
  ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
    GRANT SELECT ON TABLES TO ${DB_API_USER};
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${DB_API_USER};
EOSQL
