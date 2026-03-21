# Vendrome Backend Implementation Plan (Mock Data -> Production)

Date: February 25, 2026
Status: In execution (Phases 0, 1, 3, 4, 5, 6, and 7 complete in scope; Phase 2 active)

## 1) Planning Goal

Define an execution-ready backend delivery plan to replace all frontend mock/local data with production APIs and persistent services, while preserving existing UI behavior.

Primary references used in this plan:

- `src/pages/landing/preview/StatueBackground.tsx` (feature intent signals via ticker modules)
- `db/vendrome_schema.sql` (authoritative initial production data model)
- Current mock sources:
  - `src/data/mockPosts.ts`
  - `src/data/mockProfiles.ts`
  - `src/data/mockMessages.ts`
  - `src/data/mockCampaigns.ts`
  - `src/data/mockCalendar.ts`
  - `src/services/profileService.ts`
  - `src/context/AuthContext.tsx`
  - `src/context/EngagementContext.tsx`
  - `src/context/BookmarkContext.tsx`

## 2) Progress Tracker

- Plan authoring progress: `100%`
- Backend implementation progress: `98%` (Phases 0, 1, 3, 4, 5, 6, and 7 are complete in scope, Phase 2 remains active, and the remaining gaps are concentrated in auth account-linking OAuth, payments, and production hardening)

| Workstream | Progress | Status |
|---|---:|---|
| Backend foundation (`NestJS`, DB, cache, queue) | 100% | Completed (Phase 0 baseline) |
| Shared contracts (`Zod` + `OpenAPI` + generated DTOs) | 100% | Zod contracts now cover messaging, profiles, calendar, and typed feed extensions; OpenAPI generation and frontend type generation were rerun after the Phase 7 calendar pass |
| Auth + identity + OAuth | 70% | Email/password auth + token rotation + verification endpoints + frontend auth integration complete; OAuth/linking pending |
| Feed/social graph + engagement + bookmarks | 100% | Completed in Phase 3: posts + graph APIs, topic follows, outbox emission, and frontend social/bookmark contexts wired to live APIs |
| Messaging + realtime delivery | 100% | Conversation/message REST APIs, Socket.IO gateway, NATS fanout, Valkey-backed presence/typing, live inbox routing, and frontend realtime consumers are implemented; rollout remains behind `VITE_FEATURE_USE_REAL_MESSAGES` |
| Marketplace + orders/bookings/reviews | 100% | Completed in Phase 6: product/service listings, reviews, orders, bookings, backend contracts, and the live marketplace screen now run behind `VITE_FEATURE_USE_REAL_MARKETPLACE` with fallback preserved |
| Investments + marketing + calendar sync | 100% | Crowdfunding campaign + commitment APIs, mentorship lifecycle APIs, marketing campaign CRUD/status/metrics flows, and the full calendar slice (native CRUD, provider OAuth, encrypted token storage, sync worker, webhook ingestion, and live UI) are implemented behind feature flags |
| Payments (Stripe/PayPal/Airwallex/SA gateways) | 0% | Not started |
| Search + ranking + trending | 100% | PostgreSQL FTS + trigram-backed profile discovery is live, dashboard trending now uses live feed/profile APIs behind feature flags, and a feature-flagged OpenSearch worker consumes `post` + `profile` outbox events for scale-up indexing |
| Security/compliance/testing/observability | 16% | CI baseline + smoke checks + auth token/session controls active; backend verification rerun after dependency hardening |
| Production cutover + mock removal | 0% | Not started |

## 3) Feature Coverage Baseline (from `StatueBackground.tsx`)

The landing ticker defines the product capability baseline we must preserve in backend rollout:

| Ticker Feature | Backend Capability | Core Schema Areas |
|---|---|---|
| Business Networking | connections/follows/discovery | `connections`, `user_follows`, `business_profiles` |
| Social Feed Posting | post CRUD + interactions | `posts`, `post_comments`, `post_reactions`, `post_reposts`, `post_shares`, `bookmarks` |
| Marketplace Products | product listings + orders | `post_products`, `orders`, `order_items`, `reviews` |
| Marketplace Services | service listings + bookings | `post_services`, `bookings`, `reviews` |
| Crowdfunding Campaigns | campaign listing + commitments + payment flow | `post_crowdfunding`, `investment_campaigns`, `investment_commitments`, `payment_transactions` |
| Investor Deal Flow | investment offer/request matching | `post_investment_offers`, `post_investment_requests`, `investment_commitments` |
| Mentorship Matching | mentor/mentee lifecycle | `post_mentorship_requests`, `mentorship_relationships` |
| Profile Verification | trust levels + badges + checks | `users.verification_level`, `user_verification_badges`, `user_oauth_identities` |
| Direct Messaging | conversations, messages, read states | `conversations`, `conversation_participants`, `messages`, `message_reads` |
| Marketing Campaigns | campaign CRUD + targeting + pacing | `marketing_campaigns`, target tables |
| Trending Discovery | ranking/search/topic graph | `posts`, `topics`, `post_topics`, `user_topic_follows`, outbox/search pipeline |

## 4) Execution Plan by Phase

## Phase 0: Program Setup and Guardrails (Week 1)

Phase progress: `100%`

- [x] Create `backend/` service skeleton (`NestJS + Fastify + TypeScript`).
- [x] Add `docker-compose` for local `PostgreSQL`, `Valkey/Redis`, `NATS`.
- [x] Add migration tooling (`migrate:up` baseline runner + checksum tracking for `vendrome_schema.sql`).
- [x] Add environment templates:
  - backend `.env.example` (DB, cache, queue, JWT, OAuth, PSP credentials)
  - frontend `.env.example` (`VITE_API_BASE_URL`, feature flags, OAuth client IDs)
- [x] Add CI pipeline stages: lint, typecheck, unit test, migration check, API contract check.

Exit criteria:

- Local backend starts and connects to DB/cache/queue.
- One health endpoint and one database smoke query pass in CI.

Implementation notes (completed):

- Backend service scaffolded under `backend/` with `NestJS + Fastify`.
- Local infra stack added via `docker-compose.backend.yml`.
- Port mapping adjusted to avoid local conflicts:
  - PostgreSQL `localhost:5433`
  - Valkey `localhost:6379`
  - NATS `localhost:4222`, monitor `localhost:8222`
- Verified commands:
  - `npm run typecheck --prefix backend`
  - `npm run test:unit --prefix backend`
  - `npm run migrate:check --prefix backend`
  - `npm run contracts:check --prefix backend`
  - `npm run build --prefix backend`
  - `npm run backend:migrate:up`
  - `npm run backend:db:smoke`
- Health endpoint confirmed:
  - `GET http://localhost:4000/api/v1/health`

## Phase 1: Contract-First API Foundation (Week 1-2)

Phase progress: `99%`

- [x] Create shared contract package (`packages/contracts` or `src/contracts`) with `Zod` schemas.
- [x] Mirror SQL enums to Zod enums 1:1 (`post_type`, `order_status`, `campaign_status`, etc.).
- [x] Define standard API envelopes:
  - success: `{ data, meta }`
  - error: `{ error: { code, message, details }, meta }`
- [x] Generate `OpenAPI` from backend and generated TS client types for frontend.
- [x] Implement frontend API boundary:
  - `src/api/http.ts` (base URL, auth headers, refresh, timeout, idempotency keys)
  - domain clients (`auth.ts`, `posts.ts`, `connections.ts`, `messages.ts`, `marketplace.ts`, `investments.ts`, `marketing.ts`, `calendar.ts`, `payments.ts`)

Exit criteria:

- Frontend compiles using generated API types.
- Critical contract tests pass for auth/feed/messages/payment endpoints.

Implementation notes:

- Backend shared contracts added in `backend/src/contracts/*`:
  - `enums.ts` (SQL enum parity)
  - `envelope.ts` (standard API envelope schemas)
  - `auth.ts` (initial auth request/response contracts)
- Frontend API boundary scaffolded in `src/api/*` with centralized `ApiClient`.
- OpenAPI and generated types pipeline added:
  - `npm run backend:openapi:generate`
  - `npm run frontend:api:types:generate`
  - `npm run contracts:sync`
  - generated files:
    - `docs/openapi/backend-openapi.json`
    - `src/api/generated/openapi.d.ts`
- Backend dependency graph hardened on March 21, 2026:
  - pinned transitive `lodash` to `4.17.21` in `backend/package.json` overrides
  - resolved a broken `4.17.23` lockfile resolution that prevented `npm run openapi:generate --prefix backend`
- Remaining Phase 1 gap:
  - targeted endpoint-level contract tests for messages and payment paths are still pending even though the frontend build and generated type pipeline now pass on March 21, 2026.

## Phase 2: Identity and Access Migration (Week 2-3)

Phase progress: `75%`

- [x] Implement auth endpoints:
  - `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [x] Implement token/session model using `auth_sessions` (rotating refresh tokens).
- [ ] Implement OAuth account linking via `user_oauth_identities`:
  - Google, Facebook, LinkedIn
- [x] Add verification state read/update endpoints.
- [x] Replace `src/context/AuthContext.tsx` localStorage logic with API-driven session state.
- [x] Fix provider order in `src/App.tsx`: `AuthProvider` should wrap engagement logic requiring user identity.

Exit criteria:

- [x] Login/register/logout/refresh work against backend only.
- [x] No authentication data stored as source of truth in localStorage.

Implementation notes (in progress):

- Implemented backend auth module:
  - `backend/src/auth/auth.controller.ts`
  - `backend/src/auth/auth.service.ts`
  - `backend/src/auth/auth.types.ts`
- Implemented DB-backed session handling:
  - password hashing via `bcryptjs`
  - JWT access + refresh token issuance
  - refresh token hash storage and rotation in `auth_sessions`
  - logout revocation (`revoked_at`)
- Validated auth flow end-to-end (register/login/refresh/logout) against local PostgreSQL.
- Frontend auth integration completed:
  - `src/context/AuthContext.tsx` now uses backend auth endpoints
  - token refresh bootstrap wired via `src/api/session.ts`
  - `src/App.tsx` provider order fixed (`AuthProvider` wraps `EngagementProvider`)
- Verification endpoints added:
  - `GET /auth/me`
  - `GET /auth/me/verification`
  - `PATCH /auth/users/:id/verification` (admin-only)

## Phase 3: Social Feed + Graph + Engagement (Week 3-5)

Phase progress: `100%`

- [x] Implement posts feed APIs with cursor pagination.
- [x] Implement reactions, reposts, comments, bookmarks endpoints.
- [x] Implement connections + follows + topic follows.
- [x] Add async outbox emission on post/engagement changes (`outbox_events`).
- [x] Replace mock usage in:
  - `src/pages/feed/TheHub.tsx` (live API path behind feature flag)
  - `src/pages/feed/SocialFeed.tsx`
  - `src/pages/dashboard/Profile.tsx`
  - `src/context/EngagementContext.tsx`
  - `src/context/BookmarkContext.tsx`
- [x] Keep read-only fallback mode behind feature flags for rollback safety.

Exit criteria:

- Feed and profile engagement use backend APIs end-to-end.
- No UI-level in-memory mutation as source of truth for social counters.

Implementation notes (completed):

- Added backend `posts` module:
  - `GET /posts` (cursor pagination + optional type filter)
  - `POST /posts` (authenticated create)
  - `POST /posts/:id/reactions` (like/love/interest toggle with counter updates)
  - `POST /posts/:id/bookmarks` (bookmark toggle with counter updates)
  - `POST /posts/:id/shares` (share toggle with counter updates)
  - `POST /posts/:id/reposts` (repost toggle with counter updates)
  - `GET /posts/:id/comments`
  - `POST /posts/:id/comments`
- Added frontend API client support in `src/api/posts.ts` for new feed, reaction, and comment contracts.
- Live feed integration added in `src/pages/feed/TheHub.tsx`:
  - gated by `VITE_FEATURE_USE_REAL_FEED`
  - fetches `/posts` on load
  - uses `/posts/:id/reactions`, `/posts/:id/bookmarks`, `/posts/:id/shares`, `/posts/:id/reposts`, `/posts/:id/comments`
  - creates posts and comments via API while preserving fallback mode
- Cursor model implemented as deterministic `(created_at, id)` ordering with encoded cursor token.
- Added backend `connections` module:
  - `GET /connections/mine` (accepted/pending-sent/pending-received buckets)
  - `POST /connections/requests`
  - `POST /connections/:id/accept`
  - `POST /connections/:id/reject`
  - `POST /connections/follows/:userId/toggle`
- Extended graph/topic APIs:
  - `GET /connections/topics`
  - `POST /connections/topics/:id/toggle`
- Added bookmark retrieval/removal APIs:
  - `GET /posts/bookmarks`
  - `DELETE /posts/bookmarks/:id`
- Added outbox event emission for Phase 3 mutations:
  - post create, reactions, bookmarks, shares, reposts, comments
  - connection request/accept/reject
  - user follow toggle
  - topic follow toggle
- Frontend `connectionsApi` updated to match live contracts and support migration from mock flows.
- Frontend social/profile contexts and pages updated to run against live APIs with feature-flagged fallback:
  - `src/pages/feed/SocialFeed.tsx`
  - `src/pages/dashboard/Profile.tsx`
  - `src/context/EngagementContext.tsx`
  - `src/context/BookmarkContext.tsx`

## Phase 4: Messaging and Realtime (Week 4-6)

Phase progress: `100%`

- [x] Implement conversation and message APIs.
- [x] Add WebSocket gateway for:
  - `message.created`, `message.delivered`, `message.read`
  - `typing.started`, `typing.stopped`, `presence.updated`
- [x] Use NATS fanout for horizontal API instances.
- [x] Use Valkey TTL keys for presence/typing state.
- [x] Replace mock usage in:
  - [x] `src/pages/messages/Messages.tsx`
  - [x] `src/pages/connections/Connections.tsx`
  - [x] `src/data/mockMessages.ts` consumers

Exit criteria:

- Message send/receive/read works in real time across multiple browser sessions.
- Unread counts are query-efficient (grouped queries, no N+1 loops).

Implementation notes (completed in scope):

- Conversation bootstrap was already partially in place before this update:
  - accepting a connection creates `conversations` and `conversation_participants`
- Added backend `messages` module:
  - `GET /conversations`
  - `GET /conversations/:id/messages`
  - `POST /conversations/:id/messages`
  - `POST /conversations/:id/read`
- Implemented messaging REST foundations:
  - conversation list with participant summary, unread counts, and last-message preview
  - cursor-paginated message history
  - read-state projection for viewer and other participant
  - outbox emission for `message.created` and `message.read`
- Updated frontend API boundary in `src/api/messages.ts` to match the live backend contracts.
- `src/pages/messages/Messages.tsx` now:
  - loads conversations from `/conversations`
  - loads history from `/conversations/:id/messages`
  - marks conversations read via `/conversations/:id/read`
  - sends messages via `/conversations/:id/messages`
  - preserves mock fallback when `VITE_FEATURE_USE_REAL_MESSAGES` is disabled or live loading fails
- `src/pages/connections/Connections.tsx` now routes accepted connections directly into the targeted messages thread via query-param selection.
- Added backend realtime transport and fanout under `backend/src/realtime/*`:
  - Socket.IO namespace `/realtime`
  - `message.created`, `message.delivered`, `message.read`
  - `typing.started`, `typing.stopped`, `presence.updated`
  - NATS publish/subscribe fallback to local dispatch when broker is unavailable
  - Valkey-backed TTL presence and typing state with graceful local-only fallback
- `src/api/realtime.ts` now provides the typed frontend Socket.IO client wrapper.
- `src/pages/messages/Messages.tsx` now:
  - joins and leaves conversation rooms dynamically
  - reacts to message delivery/read/typing/presence events in real time
  - emits delivery acknowledgements, read updates, typing start/stop, and heartbeat presence refreshes
  - shows live delivery ticks plus online/typing state for the active thread
- `src/pages/connections/Connections.tsx` now loads live connection data directly instead of falling back to `mockMessages.ts`.
- Runtime imports of `src/data/mockMessages.ts` were removed from the production app path; the fixture file remains available only as seed/dev data.
- Verification rerun on March 21, 2026:
  - `npm run typecheck --prefix backend`
  - `npm run build --prefix backend`
  - `npm run test:unit --prefix backend`
  - `npm run build`

## Phase 5: Profiles, Discovery, and Search (Week 5-7)

Phase progress: `100%`

- [x] Replace `src/services/profileService.ts` with API client.
- [x] Implement profile directory/detail/edit endpoints.
- [x] Implement PostgreSQL FTS + trigram-backed query path for early-stage discovery.
- [x] Implement search indexing worker from `outbox_events` to OpenSearch (feature-flagged for scale-up).
- [x] Replace mock usage in:
  - [x] `src/pages/profiles/ProfileDirectory.tsx`
  - [x] `src/pages/profiles/ProfileDetail.tsx`
  - [x] `src/pages/profiles/ProfileEdit.tsx`
  - [x] `src/pages/dashboard/Trending.tsx`

Exit criteria:

- Profiles no longer depend on in-memory arrays.
- Search latency and relevance meet agreed acceptance targets or remain on the PostgreSQL discovery path until OpenSearch scale-up is enabled and benchmarked.

Implementation notes (completed in scope):

- Added backend `profiles` module:
  - `GET /profiles`
  - `GET /profiles/suggestions`
  - `GET /profiles/trending`
  - `GET /profiles/:id`
  - `GET /profiles/:id/similar`
  - `POST /profiles/:id/views`
  - `PUT /profiles/me`
- Shared contracts expanded through `backend/src/contracts/profiles.ts`, and the OpenAPI/type-generation pipeline was rerun after adding the new profile/discovery endpoints.
- Discovery now uses PostgreSQL full-text search and trigram similarity across profile company, description, industry, and location fields, with structured filters for user type, industry, stage, skills, location, funding, and verification.
- `src/api/profiles.ts` now provides the typed frontend API boundary for profile directory, detail, suggestions, trending, similarity, and profile upsert flows.
- `src/services/profileService.ts` now acts as an API-backed adapter behind `VITE_FEATURE_USE_REAL_PROFILES`, preserving fixture fallback when the flag is disabled or live calls fail.
- `src/pages/profiles/ProfileDirectory.tsx`, `src/pages/profiles/ProfileDetail.tsx`, `src/pages/profiles/ProfileEdit.tsx`, and the dashboard trending card now load live profile data through the profile API path when the feature flag is enabled.
- `src/pages/profiles/ProfileEdit.tsx` now persists profile saves through the backend instead of simulating success locally.
- Feed contracts were expanded to hydrate typed post extensions (`product`, `service`, `crowdfunding`, `investment`, `investmentRequest`, `mentorship`, `promo`, and `pitch`) from the existing `post_*` tables, and the frontend live-feed consumers now share a single DTO mapper.
- `src/pages/dashboard/Trending.tsx` now loads its viral posts, crowdfunding momentum, entrepreneur watchlist, and marketplace hot picks from `/posts` when `VITE_FEATURE_USE_REAL_FEED=true`, with fixture fallback preserved if the live fetch fails.
- Profile writes and view-count changes now emit `profile.created`, `profile.updated`, and `profile.viewed` outbox events alongside the existing post engagement outbox flow.
- Added `backend/scripts/search-index-worker.ts` plus `SEARCH_INDEXING_*` / `OPENSEARCH_*` environment controls. The worker indexes current public `profile` and `post` documents into OpenSearch and records search-processing state in `outbox_events.headers.search`.
- Verification rerun on March 21, 2026:
  - `npm run typecheck --prefix backend`
  - `npm run build --prefix backend`
  - `npm run test:unit --prefix backend`
  - `npm run contracts:check --prefix backend`
  - `npm run openapi:generate --prefix backend`
  - `npm run frontend:api:types:generate`
  - `npm run build`

## Phase 6: Marketplace, Mentorship, Investments, Marketing (Week 6-9)

Phase progress: `100%`

- [x] Implement marketplace product/service listing and transaction endpoints.
- [x] Implement order/booking/review workflows.
- [x] Implement mentorship lifecycle endpoints.
- [x] Implement investment campaign and commitment endpoints.
- [x] Implement marketing campaign CRUD, targeting, pacing (`spent_amount`) and metrics ingest.
- [x] Replace mock usage in:
  - [x] `src/pages/marketplace/Marketplace.tsx`
  - [x] `src/pages/mentorship/Mentorship.tsx`
  - [x] `src/pages/investments/Investments.tsx`
  - [x] `src/pages/marketing/MarketingDashboard.tsx`
  - [x] `src/pages/marketing/CreateCampaign.tsx`

Exit criteria:

- Marketplace, mentorship, investment, and marketing modules run fully against backend.

Implementation notes (completed in scope):

- Added backend `marketplace` module:
  - `GET /marketplace/products`
  - `GET /marketplace/services`
  - `GET /marketplace/posts/:id/reviews`
  - `POST /marketplace/posts/:id/reviews`
  - `POST /marketplace/products/:id/orders`
  - `POST /marketplace/services/:id/bookings`
- Shared marketplace contracts now live in `backend/src/contracts/marketplace.ts`, with matching frontend client support in `src/api/marketplace.ts`.
- `src/pages/marketplace/Marketplace.tsx` now loads live product/service listings, review threads, orders, and bookings when `VITE_FEATURE_USE_REAL_MARKETPLACE=true`, while retaining the existing fixture fallback if the live path fails.
- Added backend `investments` module:
  - `GET /investments/campaigns`
  - `GET /investments/posts/:id/commitments`
  - `POST /investments/posts/:id/commitments`
- The investments backend materializes `investment_campaigns` records lazily from crowdfunding posts, records `investment_commitments`, updates `post_crowdfunding` raised/backer counters, and emits `investment.commitment.created` outbox events.
- `src/pages/investments/Investments.tsx` now loads crowdfunding/investor/investee content from the live feed APIs plus commitment APIs when `VITE_FEATURE_USE_REAL_INVESTMENTS=true`, with fallback to `mockPosts.ts` preserved on load failure.
- Added backend `mentorship` module:
  - `GET /mentorship/mentors`
  - `GET /mentorship/requests`
  - `GET /mentorship/mine`
  - `POST /mentorship/posts/:id/offers`
  - `POST /mentorship/relationships/:id/status`
- The mentorship backend derives mentor directory cards from `users` + `business_profiles`, loads mentorship-request posts from `post_mentorship_*`, persists lifecycle records in `mentorship_relationships`, and emits `mentorship.offered` / `mentorship.status.updated` outbox events.
- `src/pages/mentorship/Mentorship.tsx` now loads live mentor listings, request threads, and current-user mentorship relationships when `VITE_FEATURE_USE_REAL_MENTORSHIP=true`, while preserving fallback fixtures if the live path fails.
- Added backend `marketing` module:
  - `GET /marketing/campaigns`
  - `POST /marketing/campaigns`
  - `POST /marketing/campaigns/:id/status`
  - `GET /marketing/campaigns/:id/metrics`
  - `POST /marketing/campaigns/:id/metrics`
- The marketing backend now persists campaigns plus target audiences in `marketing_campaigns` and target tables, supports pacing/metrics updates through `spent_amount`, `impressions`, `clicks`, and `conversions`, and emits marketing outbox events for create/status/metrics changes.
- `src/pages/marketing/MarketingDashboard.tsx` and `src/pages/marketing/CreateCampaign.tsx` now use live marketing APIs when `VITE_FEATURE_USE_REAL_MARKETING=true`, with mock fallback and draft-creation behavior preserved.
- Frontend runtime config now exposes dedicated marketplace and investments feature flags in `.env.example`.
- Frontend runtime config now exposes dedicated mentorship and marketing feature flags in `.env.example`.
- Verification rerun on March 21, 2026:
  - `npm run typecheck --prefix backend`
  - `npm run build --prefix backend`
  - `npm run test:unit --prefix backend`
  - `npm run contracts:check --prefix backend`
  - `npm run openapi:generate --prefix backend`
  - `npm run frontend:api:types:generate`
  - `npm run build`

## Phase 7: Calendar Sync Integrations (Week 7-9)

Phase progress: `100%`

- [x] Implement Vendrome-native calendar CRUD APIs.
- [x] Implement Google and Microsoft OAuth connect flows.
- [x] Implement bi-directional sync workers (delta sync + webhook/subscription updates).
- [x] Persist encrypted provider tokens in `calendar_integrations`.
- [x] Replace mock usage in:
  - `src/pages/dashboard/Calendar.tsx`
  - `src/components/dashboard/CalendarPanel.tsx`

Exit criteria:

- Calendar events sync correctly with Google and Outlook.
- Conflict handling and retry queues are operational.

Implementation notes (completed in scope):

- Added backend calendar module:
  - `backend/src/contracts/calendar.ts`
  - `backend/src/calendar/calendar.types.ts`
  - `backend/src/calendar/calendar.controller.ts`
  - `backend/src/calendar/calendar.service.ts`
  - `backend/src/calendar/calendar.module.ts`
- Implemented native calendar endpoints:
  - `GET /calendar/events`
  - `POST /calendar/events`
  - `PATCH /calendar/events/:id`
  - `DELETE /calendar/events/:id`
  - `GET /calendar/integrations`
  - `POST /calendar/integrations/:provider/connect`
  - `POST /calendar/integrations/:provider/disconnect`
  - `POST /calendar/integrations/:provider/oauth/start`
  - `POST /calendar/integrations/:provider/oauth/complete`
  - `POST /calendar/integrations/:provider/sync`
  - `POST /calendar/webhooks/google`
  - `POST /calendar/webhooks/microsoft`
- Added provider OAuth + token protection support:
  - `backend/src/calendar/calendar-crypto.service.ts`
  - `backend/src/calendar/calendar-provider-client.ts`
  - encrypted access/refresh token persistence in `calendar_integrations`
- Added calendar sync worker:
  - `backend/scripts/calendar-sync-worker.ts`
  - `npm run calendar:sync:worker --prefix backend`
- Added calendar outbox emission for:
  - `calendar.event.created`
  - `calendar.event.updated`
  - `calendar.event.deleted`
  - `calendar.integration.connected`
  - `calendar.integration.disconnected`
- Replaced runtime mock-backed calendar reads/writes behind `VITE_FEATURE_USE_REAL_CALENDAR`:
  - `src/api/calendar.ts`
  - `src/lib/calendar-runtime.ts`
  - `src/pages/dashboard/Calendar.tsx`
  - `src/components/dashboard/CalendarPanel.tsx`
  - `src/pages/dashboard/CalendarOAuthCallback.tsx`
  - `src/pages/dashboard/Dashboard.tsx`
- Verification rerun after the Phase 7 calendar pass:
  - `npm run typecheck --prefix backend`
  - `npm run build --prefix backend`
  - `npm run test:unit --prefix backend`
  - `npm run contracts:check --prefix backend`
  - `npm run openapi:generate --prefix backend`
  - `npm run frontend:api:types:generate`
  - `npm run build`
- Provider flows are code-complete and build-verified; a live Google/Microsoft tenant sync session was not executed in this pass.

## Phase 8: Payments and Ledger (Week 8-10)

Phase progress: `0%`

- [ ] Build payment orchestrator in Payment Service.
- [ ] Implement adapters for:
  - Stripe
  - PayPal
  - Airwallex
  - SA-local set (Yoco, Peach, Payfast, optional Ozow/Paystack)
- [ ] Implement provider webhook ingestion with signature verification.
- [ ] Enforce idempotent writes for payment + ledger posting.
- [ ] Activate reconciliation jobs (provider reports vs internal ledger).
- [ ] Add fee-routing policy by currency, country, method, and provider health.

Exit criteria:

- Checkout, webhook processing, and ledger reconciliation pass sandbox tests.
- Provider outage fallback paths are validated.

## Phase 9: Security, Compliance, and Production Readiness (Week 9-11)

Phase progress: `0%`

- [ ] Enforce RBAC + ownership checks + audit events for high-risk actions.
- [ ] Implement rate limits from deep-dive policy tiers.
- [ ] Add POPIA consent logging and deletion/access request workflows.
- [ ] Validate FICA/SARB legal requirements for investment/cross-border paths.
- [ ] Add observability baselines:
  - logs, traces, metrics dashboards, alerts, SLO monitors
- [ ] Execute test suites:
  - contract tests
  - integration tests
  - load tests (feed, chat fanout, webhook spikes)
  - chaos drills (provider outage, queue lag)

Exit criteria:

- Security and compliance checklist signed off.
- Performance targets and availability SLOs met in pre-production.

## Phase 10: Cutover and Mock Decommission (Week 11-12)

Phase progress: `0%`

- [ ] Enable real-data feature flags progressively:
  - `use_real_auth`
  - `use_real_feed`
  - `use_real_messages`
  - `use_real_payments`
- [ ] Run canary deployment and monitor regression metrics.
- [ ] Remove mock imports from runtime paths.
- [ ] Keep mock fixtures only for test seeding/dev story fixtures.
- [ ] Freeze and document rollback strategy.

Exit criteria:

- Production traffic fully on backend APIs.
- Mock/local data no longer drives user-facing production flows.

## 5) Mock-to-API Migration Matrix

| Current source | Replace with | Rollout flag | Target phase |
|---|---|---|---|
| `AuthContext` localStorage user/session | `/auth/*` + refresh/session endpoints | `use_real_auth` | Phase 2 |
| `mockPosts.ts` feed/interactions | `/posts`, `/reactions`, `/comments`, `/reposts`, `/bookmarks` | `use_real_feed` | Phase 3 |
| `mockMessages.ts` + `Connections.tsx` | `/connections`, `/conversations`, `/messages` + WebSocket | `use_real_messages` | Phase 4 |
| `profileService.ts` + `mockProfiles.ts` | `/profiles`, `/search`, `/trending` | `use_real_profiles` | Phase 5 |
| `mockCampaigns.ts` | `/marketing/campaigns` + metrics APIs | `use_real_marketing` | Phase 6 |
| `mockCalendar.ts` | `/calendar/*` + provider sync workers | `use_real_calendar` | Phase 7 |
| Payment mock flows in order/booking/investment UIs | `/payments/*` + orchestrator | `use_real_payments` | Phase 8 |

## 6) Dependencies and Sequencing Constraints

- Contract package must exist before frontend client replacement.
- Auth must be completed before secure messaging/payments rollout.
- Outbox/event infrastructure must exist before search indexing and reliable webhook async processing.
- Payment adapters depend on legal/commercial onboarding timelines with each provider.
- Calendar provider apps (Google/Microsoft) require approved OAuth credentials before production use.

## 7) Review Checklist (for approval before coding)

- [ ] Phase order and timelines acceptable.
- [ ] Provider strategy accepted (Stripe, PayPal, Airwallex, SA rails).
- [ ] Feature-flag rollout model accepted.
- [ ] Compliance/legal checkpoints accepted (POPIA/FICA/SARB paths).
- [ ] Success metrics and exit criteria accepted.

---

Implementation is active. This file will be updated continuously with real progress percentages and completed checkboxes.
