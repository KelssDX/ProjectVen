# Backend Migrations

Current baseline migration source is `db/vendrome_schema.sql`.

- Apply baseline schema: `npm run migrate:up --prefix backend`
- Verify schema file integrity: `npm run migrate:check --prefix backend`

`schema_migrations` records applied migration name + checksum for idempotency and drift detection.
