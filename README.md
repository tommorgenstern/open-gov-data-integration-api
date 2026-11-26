# Open Data Integration: Road Accidents in Germany

This project integrates several official German open-data sources around the **Unfallatlas**
(the federal statistical offices' map of road accidents involving personal injury) into a
canonical relational schema and serves the harmonised data through a **REST API**. A reproducible
**ETL pipeline** loads the database; a small **demo client** shows typical queries.

The data, the API documentation and the demo client are in German, since the data and region names are German. The code and this README are in English.

> **Note on credentials:** [`.env.example`](.env.example) intentionally contains sample
> credentials for a throwaway local Docker database that is only reachable via `localhost`. They
> are not real secrets; set your own values in `.env` for any other deployment.

---

## 1. Architecture

```
Browser (demo client, static HTML)
        │  HTTP/JSON only
        ▼
NestJS REST API  ──(read-only role api_reader)──►  PostgreSQL
        ▲                                               ▲
        │                                               │ (write role etl_owner)
   OpenAPI /docs                                   ETL pipeline
                                            (Extract→Parse→Map→Load→Aggregate)
                                                        ▲
                                Unfallatlas (download) · Gemeindeverzeichnis · KBA FZ1
```

- The client talks to the API only, never to the database.
- The API serves **stored**, already harmonised data. It does not query the sources live.
- Every data response carries **provenance and licence** information (`meta.provenance`).
- Two database roles: the ETL writes as the schema owner, while the API connects with a
  `SELECT`-only role.

## 2. Tech stack

| Component | Technology | Rationale |
|---|---|---|
| API + ETL | **NestJS / TypeScript** | one language throughout; `@nestjs/swagger` generates the OpenAPI spec from code annotations |
| Database | **PostgreSQL 16** | relational schema; aggregation via `LEFT JOIN`/`GROUP BY` for rankings, rates and zero-count regions |
| DB access | **Kysely** (type-safe query builder) | parameterised SQL (injection-safe) with full control over analytical queries |
| Runtime | **Docker Compose** | reproducible on any machine with Docker |

Requirements: Docker (or Node.js ≥ 20 for running without Docker) and a current browser.

## 3. Quick start (Docker)

```bash
cp .env.example .env                  # create local configuration (once)
docker compose build                  # build API and ETL images
docker compose up -d                  # start Postgres + API
docker compose run --rm etl           # load the database (downloads the Unfallatlas)
```

- API + demo client: <http://localhost:3000/>
- API documentation (Swagger/OpenAPI): <http://localhost:3000/docs>, or [`openapi.json`](openapi.json)

The first ETL run downloads ~309 MB of Unfallatlas files (see section 6) and takes a few minutes.
You can safely run it again, since re-runs are idempotent.

## 4. Configuration

All credentials and ports live in one place: `.env`, copied once from
[`.env.example`](.env.example) (`.env` itself is gitignored). Both docker-compose (variable
interpolation) and the Node process (via `dotenv`) read it. No credentials are hard-coded. If
`.env` is missing, `docker compose` aborts with a hint.

The sample values are local development credentials. The database (5432) and the API (3000) are
bound to `127.0.0.1` only and are not reachable from the network.

## 5. Data sources and licences

| Source | Content | Format | Licence |
|---|---|---|---|
| **Unfallatlas** ([opengeodata.nrw.de](https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/)), 2016–2024 | accidents involving personal injury (point data) | CSV | Datenlizenz Deutschland – Namensnennung 2.0 |
| **Gemeindeverzeichnis** ([Destatis](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html), as of 31 Dec 2024) | complete region reference (AGS) + population | XLSX | Datenlizenz Deutschland – Namensnennung 2.0 |
| **KBA FZ1** ([Kraftfahrt-Bundesamt](https://www.kba.de/DE/Statistik/Fahrzeuge/Bestand/bestand_node.html), 2022, 2023) | registered passenger cars per registration district | XLSX | Datenlizenz Deutschland – Namensnennung 2.0 |

Data sources: © Statistische Ämter des Bundes und der Länder; © Kraftfahrt-Bundesamt, Flensburg.
Licence text: <https://www.govdata.de/dl-de/by-2-0>. The Gemeindeverzeichnis and KBA files are
included unchanged under [`data/raw/`](data/raw/). The field definitions of the Unfallatlas are
documented in the official
[dataset description (PDF)](https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/DSB_Unfallatlas.pdf).

Licence and origin are stored in the database (`sources`) and returned with every API response.

## 6. ETL pipeline

An idempotent script (`src/etl/run.ts`) runs five stages: **Extract → Parse → Map → Load → Aggregate**.

- **Extract:** The Unfallatlas (~309 MB) is not versioned. It is downloaded from the official source
  and unzipped during the run. Years already present on disk are skipped. The small
  Gemeindeverzeichnis and KBA files are bundled under `data/raw/`.
- **Parse:** semicolon-separated values, German decimal commas, BOM handling. Column drift across
  years is normalised via aliases (Unfallatlas) and header detection (KBA).
- **Map:** builds the 8-digit AGS (*Amtlicher Gemeindeschlüssel*, official municipality key) from
  `ULAND+UREGBEZ+UKREIS+UGEMEINDE` and assigns each accident to the finest known region
  (municipality → district → state).
- **Load:** transactional inserts, one `import_runs` entry per dataset (provenance). Re-imports use
  *delete-then-insert*.
- **Aggregate:** rolls population up to district and state level.

**Incremental updates:** the same script uses `import_runs` to detect datasets that are already
loaded.

```bash
docker compose run --rm etl                               # full rebuild
docker compose run --rm etl node dist/etl/run.js --update # only new/changed datasets
```

When a new year is published (e.g. 2025), adding it to the manifest and running `--update` again
is enough. The pipeline does not crawl URLs, so the external services are not queried more than
necessary.

## 7. Database schema

```
regions(region_id, ags UNIQUE, name, level, parent_region_id, population)
accidents(accident_id, uid, year, month, hour, weekday, category, type, light,
          is_bike, is_car, is_foot, is_motorbike, is_truck, is_other,
          lon, lat, region_id → regions, import_run_id → import_runs)
indicators(indicator_id, code, name, unit, source_system)
indicator_values(region_id, indicator_id, year, value)          -- e.g. registered cars
sources(source_id, name, url, license, license_url, format, retrieved_at)
import_runs(import_run_id, source_id, dataset_key, started_at, finished_at,
            rows_in, rows_loaded, rows_rejected, notes)
```

**Join strategy (AGS):** the AGS, stored as a string, is the common key across all sources.
`level=state` uses the first 2 digits, `district` uses 5 and `municipality` uses 8. All aggregations
use a prefix match, so the same query serves state, district and municipality level. Regions with
zero accidents are preserved via a `LEFT JOIN` from the complete region reference.

**Indexes** follow the general access paths rather than individual queries:
- foreign keys: `accidents.region_id`, `accidents.import_run_id`, `regions.parent_region_id`
- `accidents(region_id, year)` for regional filters per year
- `accidents(year)` as the most common standalone filter

Low-cardinality columns (category, participant flags) are deliberately not indexed. They select large
parts of the table, so a sequential scan is cheaper there.

Schema DDL: [`db/schema.sql`](db/schema.sql).

## 8. REST API

Full documentation at **/docs**. Main endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /regions`, `GET /regions/{ags}` | regions; a single region includes `data_coverage` (earliest/latest year) |
| `GET /accidents` | individual accidents, filtered and paginated |
| `GET /accident-statistics` | aggregated accident counts (+ rate per 100,000 via `per=population\|pkw`); rankings (`sort`, `limit`); regions without accidents (`maxCount=0`) |
| `GET /sources`, `GET /sources/{id}` | data sources and licences (as DCAT/RDF with `Accept: text/turtle`) |
| `GET /import-runs`, `GET /import-runs/{id}` | provenance of ETL runs |

**Provenance envelope:** data responses have the form
`{ "data": …, "meta": { "provenance": { "sources": [ { name, url, license, license_url, retrieved_at } ] } } }`.
Aggregates that combine several sources list one entry per contributing source.

**Linked Data:** `GET /sources` supports content negotiation. With `Accept: text/turtle` it returns
the source catalogue as RDF using the DCAT and Dublin Core vocabularies.

**Errors:** `400` (invalid parameters), `404` (unknown region/resource), `422` (invalid
combination, e.g. `per=pkw` outside district level), `500`, `503` (database unavailable). Each
error comes with a descriptive message.

## 9. Example queries

| Question | Request | Result |
|---|---|---|
| Earliest year with data | `/regions/00` | 2016 |
| Accidents in Saxony, 2023 | `/accident-statistics?level=state&year=2023` | 12,513 |
| First year with data for North Rhine-Westphalia | `/regions/05` | 2019 |
| First year with data for Mecklenburg-Western Pomerania | `/regions/13` | 2020 |
| Pedestrian accidents in Berlin, 2023 | `…?level=state&year=2023&participant=foot` | 1,794 |
| Accidents per 100,000 registered cars (districts) | `…?level=district&year=2023&per=pkw` | rate (Unfallatlas × KBA) |
| Accidents per 100,000 inhabitants (states) | `…?level=state&year=2023&per=population` | rate (Unfallatlas × Gemeindeverzeichnis) |
| Municipalities in Saxony without accidents | `…?level=municipality&parent=14&year=2023&maxCount=0` | 7 municipalities |

The first years differ by state because the Unfallatlas started in 2016 with 8 federal states and
covered all 16 by 2020. All values are computed from the stored data.

## 10. Demo client

A static page ([`client/index.html`](client/index.html)) at <http://localhost:3000/>. It has one
button per example query, calls the API and shows the answer including source and licence. It
also links to `/docs`.

## 11. Data quality checks

After loading, the ETL checks:
- `rows_in = rows_loaded + rows_rejected` for every import run
- no orphaned accidents (every accident is assigned to a region)
- value ranges (category 1–3, month 1–12, hour 0–23)
- coordinates inside Germany

It then prints a coverage summary.

## 12. Known limitations

- The Unfallatlas only contains accidents involving personal injury.
- KBA registration districts do not match administrative districts exactly, so rates per car are
  approximate.
- Population is as of 31 Dec 2024, which differs from the accident year for per-capita rates.
- Administrative boundaries and AGS codes change over time (territorial reforms).

## 13. Reproducibility and project structure

Full rebuild from source:

```bash
docker compose down -v && docker compose build && docker compose up -d && docker compose run --rm etl
```

```
.
├── docker-compose.yml, Dockerfile, .env.example
├── db/schema.sql, db/init/00-roles.sh
├── src/                NestJS API + ETL (src/etl)
├── client/index.html   demo client
├── data/raw/           Gemeindeverzeichnis + KBA (Unfallatlas is downloaded)
└── openapi.json        exported OpenAPI spec (npm run openapi:export)
```

Not versioned: `node_modules/`, `dist/`, `.env`, the downloaded Unfallatlas files.

## 14. Licence

Code: [MIT](LICENSE). The data is licensed by the respective providers (see section 5).

---

*Originally developed as a university project (TU Chemnitz, 2026).*
