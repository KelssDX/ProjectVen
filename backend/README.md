# Vendrome Backend

## Stack

- NestJS + Fastify
- PostgreSQL
- Valkey
- NATS JetStream

## Local setup

1. Start infrastructure:
   - `npm run infra:up`
2. Create env file:
   - copy `backend/.env.example` to `backend/.env`
3. Install backend dependencies:
   - `npm install --prefix backend`
4. Start backend:
   - `npm run dev:backend`

Health endpoint:

- `GET http://localhost:4000/api/v1/health`

Local infrastructure ports:

- PostgreSQL: `localhost:5433`
- Valkey: `localhost:6379`
- NATS: `localhost:4222` (monitoring `localhost:8222`)

## Checks

- Typecheck: `npm run typecheck:backend`
- Unit test: `npm run test:backend`
- Apply migration: `npm run migrate:up --prefix backend`
- Migration check: `npm run migrate:check --prefix backend`
- Contract check: `npm run contracts:check --prefix backend`
- OpenAPI generation: `npm run openapi:generate --prefix backend`
- DB smoke check: `npm run backend:db:smoke`
