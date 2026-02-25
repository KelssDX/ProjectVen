# Vendrome Backend Implementation Plan (Mock Data -> Production)

Date: February 25, 2026
Status: Planning draft for review

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
- Backend implementation progress: `0%` (awaiting review/approval)

| Workstream | Progress | Status |
|---|---:|---|
| Backend foundation (`NestJS`, DB, cache, queue) | 0% | Not started |
| Shared contracts (`Zod` + `OpenAPI` + generated DTOs) | 0% | Not started |
| Auth + identity + OAuth | 0% | Not started |
| Feed/social graph + engagement + bookmarks | 0% | Not started |
| Messaging + realtime delivery | 0% | Not started |
| Marketplace + orders/bookings/reviews | 0% | Not started |
| Investments + marketing + calendar sync | 0% | Not started |
| Payments (Stripe/PayPal/Airwallex/SA gateways) | 0% | Not started |
| Search + ranking + trending | 0% | Not started |
| Security/compliance/testing/observability | 0% | Not started |
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

Phase progress: `0%`

- [ ] Create `backend/` service skeleton (`NestJS + Fastify + TypeScript`).
- [ ] Add `docker-compose` for local `PostgreSQL`, `Valkey/Redis`, `NATS`.
- [ ] Add migration tooling (`drizzle` or `prisma` migrations aligned to `vendrome_schema.sql`).
- [ ] Add environment templates:
  - backend `.env.example` (DB, cache, queue, JWT, OAuth, PSP credentials)
  - frontend `.env.example` (`VITE_API_BASE_URL`, feature flags, OAuth client IDs)
- [ ] Add CI pipeline stages: lint, typecheck, unit test, migration check, API contract check.

Exit criteria:

- Local backend starts and connects to DB/cache/queue.
- One health endpoint and one database smoke query pass in CI.

## Phase 1: Contract-First API Foundation (Week 1-2)

Phase progress: `0%`

- [ ] Create shared contract package (`packages/contracts` or `src/contracts`) with `Zod` schemas.
- [ ] Mirror SQL enums to Zod enums 1:1 (`post_type`, `order_status`, `campaign_status`, etc.).
- [ ] Define standard API envelopes:
  - success: `{ data, meta }`
  - error: `{ error: { code, message, details }, meta }`
- [ ] Generate `OpenAPI` from backend and generated TS client types for frontend.
- [ ] Implement frontend API boundary:
  - `src/api/http.ts` (base URL, auth headers, refresh, timeout, idempotency keys)
  - domain clients (`auth.ts`, `posts.ts`, `connections.ts`, `messages.ts`, `marketplace.ts`, `investments.ts`, `marketing.ts`, `calendar.ts`, `payments.ts`)

Exit criteria:

- Frontend compiles using generated API types.
- Critical contract tests pass for auth/feed/messages/payment endpoints.

## Phase 2: Identity and Access Migration (Week 2-3)

Phase progress: `0%`

- [ ] Implement auth endpoints:
  - `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [ ] Implement token/session model using `auth_sessions` (rotating refresh tokens).
- [ ] Implement OAuth account linking via `user_oauth_identities`:
  - Google, Facebook, LinkedIn
- [ ] Add verification state read/update endpoints.
- [ ] Replace `src/context/AuthContext.tsx` localStorage logic with API-driven session state.
- [ ] Fix provider order in `src/App.tsx`: `AuthProvider` should wrap engagement logic requiring user identity.

Exit criteria:

- Login/register/logout/refresh work against backend only.
- No authentication data stored as source of truth in localStorage.

## Phase 3: Social Feed + Graph + Engagement (Week 3-5)

Phase progress: `0%`

- [ ] Implement posts feed APIs with cursor pagination.
- [ ] Implement reactions, reposts, comments, bookmarks endpoints.
- [ ] Implement connections + follows + topic follows.
- [ ] Add async outbox emission on post/engagement changes (`outbox_events`).
- [ ] Replace mock usage in:
  - `src/pages/feed/TheHub.tsx`
  - `src/pages/feed/SocialFeed.tsx`
  - `src/pages/dashboard/Profile.tsx`
  - `src/context/EngagementContext.tsx`
  - `src/context/BookmarkContext.tsx`
- [ ] Keep read-only fallback mode behind feature flags for rollback safety.

Exit criteria:

- Feed and profile engagement use backend APIs end-to-end.
- No UI-level in-memory mutation as source of truth for social counters.

## Phase 4: Messaging and Realtime (Week 4-6)

Phase progress: `0%`

- [ ] Implement conversation and message APIs.
- [ ] Add WebSocket gateway for:
  - `message.created`, `message.delivered`, `message.read`
  - `typing.started`, `typing.stopped`, `presence.updated`
- [ ] Use NATS fanout for horizontal API instances.
- [ ] Use Valkey TTL keys for presence/typing state.
- [ ] Replace mock usage in:
  - `src/pages/messages/Messages.tsx`
  - `src/pages/connections/Connections.tsx`
  - `src/data/mockMessages.ts` consumers

Exit criteria:

- Message send/receive/read works in real time across multiple browser sessions.
- Unread counts are query-efficient (grouped queries, no N+1 loops).

## Phase 5: Profiles, Discovery, and Search (Week 5-7)

Phase progress: `0%`

- [ ] Replace `src/services/profileService.ts` with API client.
- [ ] Implement profile directory/detail/edit endpoints.
- [ ] Implement PostgreSQL FTS + trigram-backed query path for early-stage discovery.
- [ ] Implement search indexing worker from `outbox_events` to OpenSearch (feature-flagged for scale-up).
- [ ] Replace mock usage in:
  - `src/pages/profiles/ProfileDirectory.tsx`
  - `src/pages/profiles/ProfileDetail.tsx`
  - `src/pages/profiles/ProfileEdit.tsx`
  - `src/pages/dashboard/Trending.tsx`

Exit criteria:

- Profiles no longer depend on in-memory arrays.
- Search latency and relevance meet agreed acceptance targets.

## Phase 6: Marketplace, Mentorship, Investments, Marketing (Week 6-9)

Phase progress: `0%`

- [ ] Implement marketplace product/service listing and transaction endpoints.
- [ ] Implement order/booking/review workflows.
- [ ] Implement mentorship lifecycle endpoints.
- [ ] Implement investment campaign and commitment endpoints.
- [ ] Implement marketing campaign CRUD, targeting, pacing (`spent_amount`) and metrics ingest.
- [ ] Replace mock usage in:
  - `src/pages/marketplace/Marketplace.tsx`
  - `src/pages/mentorship/Mentorship.tsx`
  - `src/pages/investments/Investments.tsx`
  - `src/pages/marketing/MarketingDashboard.tsx`
  - `src/pages/marketing/CreateCampaign.tsx`

Exit criteria:

- Marketplace, mentorship, investment, and marketing modules run fully against backend.

## Phase 7: Calendar Sync Integrations (Week 7-9)

Phase progress: `0%`

- [ ] Implement Vendrome-native calendar CRUD APIs.
- [ ] Implement Google and Microsoft OAuth connect flows.
- [ ] Implement bi-directional sync workers (delta sync + webhook/subscription updates).
- [ ] Persist encrypted provider tokens in `calendar_integrations`.
- [ ] Replace mock usage in:
  - `src/pages/dashboard/Calendar.tsx`
  - `src/components/dashboard/CalendarPanel.tsx`

Exit criteria:

- Calendar events sync correctly with Google and Outlook.
- Conflict handling and retry queues are operational.

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

If approved, implementation starts at Phase 0 and this file will be updated continuously with real progress percentages and completed checkboxes.
