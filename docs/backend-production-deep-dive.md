# Vendrome Backend Production Deep Dive

Date: February 24, 2026

## 1) Objective

This document defines how to replace all frontend mock/local data with a production backend that can:

- Serve social features at low latency.
- Scale to thousands of concurrent users and large datasets.
- Support global financial transactions.
- Keep strong audit trails for app actions.
- Enforce security and compliance-ready controls.

It is aligned to the current codebase behavior and data shapes, and includes a production SQL schema in:

- `db/vendrome_schema.sql`

## 2) Current State Findings (Code Audit)

### 2.1 Frontend app status

- React + Vite client only (`src/App.tsx`, `src/main.tsx`).
- No real API integration layer (`fetch`/`axios` absent for core data).
- Core business data comes from mock files:
  - `src/data/mockPosts.ts`
  - `src/data/mockProfiles.ts`
  - `src/data/mockMessages.ts`
  - `src/data/mockCampaigns.ts`
  - `src/data/mockCalendar.ts`
- Authentication is local-only:
  - `src/context/AuthContext.tsx` stores session/user in `localStorage`.
  - No password verification, token issuance, MFA, or server-side sessions.
- Engagement/bookmarks are local-only:
  - `src/context/EngagementContext.tsx`
  - `src/context/BookmarkContext.tsx`
- Profile service is in-memory mock:
  - `src/services/profileService.ts`

### 2.2 Feature modules already implemented in UI

- Social feed and interactions (post types, comments, likes, shares, reposts, bookmarks).
- Messaging and connection requests.
- Marketplace (products/services), reviews, order/booking dialogs.
- Investments (crowdfunding and investor/investee workflows).
- Mentorship marketplace and requests.
- Marketing campaigns (creation and metrics).
- Calendar (multi-view events, integrations, conflict checks).

### 2.3 Main production gaps

- No backend services or persistent datastore.
- No queue/event bus for async workflows.
- No payment processor integration.
- No centralized audit log/immutable history.
- No server-side authorization/RBAC or policy enforcement.
- No observability stack or SLOs.

## 2.4 Recommended named stack (best balance of cost, reliability, trust, security)

- API and backend:
  - `Node.js 24 LTS`
  - `TypeScript`
  - `NestJS` + `Fastify` adapter
  - `Zod` + `OpenAPI` for strict validation and typed contracts
- Database:
  - `PostgreSQL` (primary system of record)
  - `PgBouncer` for connection pooling
- Cache and rate limit store:
  - `Valkey` (open-source-first default)
  - `Redis` managed option if operational simplicity is preferred
- Eventing/queues:
  - `NATS JetStream` (reliable async workflows and event fanout)
- Object/file storage:
  - Cost-effective managed default: `Cloudflare R2` (or `S3` if AWS-first)
  - Self-host option: `MinIO` (only if team accepts AGPL and self-hosting overhead)
- Identity:
  - Open-source-first: `Keycloak` (OIDC/SAML/MFA)
  - Managed fallback if needed: Auth0/Clerk
- Observability:
  - `OpenTelemetry Collector`
  - `Prometheus` (metrics), `Jaeger` (traces)
  - logs via OpenSearch-compatible stack or managed logging
- Edge and protection:
  - `Cloudflare` for CDN + WAF + bot/rate protection
- Delivery and infra:
  - `Docker`, `Kubernetes` (`k3s` for lean cost footprints), `Terraform`, `GitHub Actions`

## 2.5 Cost strategy (open-source-first without compromising trust)

- Use open-source core components by default to reduce lock-in and license cost.
- Use managed services selectively for high-risk operational areas (DB backups/PITR, payments, edge security).
- Do not over-optimize cost in trust-critical layers:
  - authentication
  - payment processing
  - backups/recovery
  - audit logging
- Minimum secure baseline for production:
  - MFA for admin/finance-sensitive roles
  - encrypted transport and encrypted-at-rest storage
  - auditable auth and payment actions
  - routine patch and dependency scanning process

## 3) Target Production Architecture

## 3.1 High-level architecture

- Client: React SPA.
- Edge:
  - CDN for static assets and media.
  - WAF + rate limiting.
  - API gateway for auth, routing, throttling.
- Backend:
  - Modular API services (REST + WebSocket where needed).
  - Background worker services for async jobs.
  - Event bus for reliable decoupled processing.
- Data:
  - PostgreSQL (system of record, relational consistency).
  - Valkey or Redis (cache/session/rate limits/hot counters).
  - Object storage for media/attachments.
  - Search index (optional phase 2+) for full-text/discovery.
  - Warehouse/lake for BI (optional phase 2+).

## 3.2 Service boundaries

- Identity Service: user accounts, auth, MFA, session/token lifecycle.
- Profile Service: business profiles, skills, achievements, visibility.
- Social Service: posts, media refs, comments, reactions, shares, bookmarks.
- Graph Service: connections and relationship state.
- Messaging Service: conversations/messages/read-state.
- Commerce Service: products/services/orders/bookings/reviews.
- Investment Service: campaigns, commitments, statuses, docs.
- Marketing Service: campaigns, targeting, budget pacing, metrics ingest.
- Calendar Service: events, integrations, sync statuses.
- Payment Service: provider orchestration, payment intents, ledger, payouts.
- Audit Service: append-only event trail with retention and tamper controls.
- Notification Service: email/push/in-app delivery.

## 4) Data Model and SQL

The initial production schema is provided in:

- `db/vendrome_schema.sql`

It includes:

- Identity and sessions.
- Profiles + normalized sub-entities.
- Feed/posts + typed post extensions.
- Connections + messaging.
- Marketplace, orders/bookings, reviews.
- Investment and marketing modules.
- Calendar/integrations.
- Payments + double-entry ledger.
- Notifications.
- Partitioned audit table (`audit_events`) for long-term scale.

## 5) API Design (v1)

## 5.1 Core API patterns

- REST for CRUD workflows.
- WebSocket channels for messaging and near-real-time feed counters.
- Cursor-based pagination for feed/messages.
- Idempotency keys on write endpoints that trigger money or side effects.
- Versioned routes: `/api/v1/...`.

## 5.2 Key endpoint groups

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/mfa/verify`
  - `GET /auth/oauth/google/start`
  - `GET /auth/oauth/facebook/start`
  - `GET /auth/oauth/linkedin/start`
  - `GET /auth/oauth/:provider/callback`
- Feed:
  - `GET /posts`
  - `POST /posts`
  - `POST /posts/:id/reactions`
  - `POST /posts/:id/comments`
  - `POST /posts/:id/bookmarks`
- Graph/Messaging:
  - `POST /connections/requests`
  - `POST /connections/:id/accept`
  - `GET /conversations`
  - `GET /conversations/:id/messages`
  - `POST /conversations/:id/messages`
- Commerce:
  - `GET /marketplace/products`
  - `GET /marketplace/services`
  - `POST /orders`
  - `POST /bookings`
  - `POST /reviews`
- Investment:
  - `GET /investments/campaigns`
  - `POST /investments/campaigns/:id/commitments`
- Marketing:
  - `POST /marketing/campaigns`
  - `GET /marketing/campaigns/:id/metrics`
- Calendar:
  - `GET /calendar/events`
  - `POST /calendar/events`
  - `GET /calendar/integrations`
  - `POST /calendar/integrations/google/connect`
  - `POST /calendar/integrations/microsoft/connect`
  - `POST /calendar/integrations/:provider/sync`

## 5.3 Calendar provider integration (Google + Microsoft Outlook)

- Vendor calendar is the in-app source users interact with.
- External provider sync is bi-directional with provider-specific webhooks/subscriptions.
- Integration flow:
  - User starts connect flow in app.
  - OAuth2 consent for Google or Microsoft is completed.
  - Access/refresh tokens are encrypted at rest.
  - Initial backfill imports a configurable time window (for example, past 30 days + next 180 days).
- Ongoing sync:
  - Pull sync via delta/sync token where provider supports it.
  - Push sync on local event changes.
  - Webhook/subscription notifications trigger near-real-time reconciliation workers.
- Conflict handling:
  - Keep `source` (`vendrom|google|microsoft`) and `external_event_id`.
  - Apply deterministic conflict rules:
    - if updated on provider later than local and no local unsynced changes, accept provider.
    - if both changed, mark as conflict and queue user-visible resolution.
- Reliability controls:
  - idempotent upserts by `(provider, external_event_id, user_id)`.
  - dead-letter queue for failed sync jobs.
  - token refresh retry policy and reconnect workflow.
- DB alignment:
  - `calendar_integrations` stores provider connection state and sync metadata.
  - `calendar_events` stores normalized events for in-app calendar rendering.

## 6) Performance and Scalability Strategy

## 6.0 Feed/search algorithms (what will run at scale)

- Feed ranking v1 (hybrid deterministic + score-based):
  - base recency score (time decay)
  - relationship strength score (accepted connections, message/interaction history)
  - engagement score (likes/comments/reposts/interests normalized by post age)
  - interest affinity (user interaction history by post type/tag/category)
  - quality/safety score modifiers (verified actors, policy moderation flags)
- Feed candidate generation:
  - candidate pool from network graph + followed topics + trending set
  - dedupe and diversity constraints (avoid repetitive author/topic clustering)
  - return cursor-based pages for stable infinite scroll
- Feed serving latency path:
  - precomputed candidate sets in cache for active users
  - real-time score adjustments for fresh interactions
  - fallback to recency if ranking service is degraded

- Search v1 (instant search with large volumes):
  - use dedicated search engine (OpenSearch/Elasticsearch) for full-text and faceting
  - PostgreSQL remains source of truth; search index is derived/async
  - autocomplete endpoint backed by prefix index + cached hot queries
  - typed filters (industry, stage, location, post type) served from indexed fields
- Search indexing pipeline:
  - outbox/event bus emits entity changes (`post_created`, `profile_updated`, etc.)
  - indexer workers upsert documents to search cluster
  - near-real-time target: under ~2-5 seconds index freshness for new content
- Search relevance model v1:
  - textual relevance (BM25 style)
  - freshness boost
  - social proof boost (engagement and relationship proximity)
  - exact-match and phrase boosts for company/profile names
- Scale controls:
  - shard/replica tuning by index size and QPS
  - query timeout budgets + graceful fallback to cached or DB-backed basic search
  - anti-abuse throttling and bot filtering at edge

## 6.1 Data access

- PostgreSQL indexes on all high-cardinality query keys.
- Partition high-growth tables:
  - `posts` by month (phase 2 if required).
  - `audit_events` by month from day one.
  - `ledger_entries` by month once volume grows.
- Read replicas for high read traffic (feed/profile/search screens).
- Valkey/Redis for:
  - hot feed pages
  - rate limiting keys
  - ephemeral counters and dedupe keys

## 6.2 Async and heavy workloads

- Queue/event bus for:
  - notification fanout
  - media processing
  - analytics aggregation
  - search indexing
  - payment webhook processing
  - calendar provider sync jobs
- Use outbox pattern from Postgres to event bus for transactional consistency.

## 6.3 Suggested initial SLOs

- Auth endpoints p95 < 200 ms.
- Feed read p95 < 300 ms.
- Message send ack p95 < 150 ms.
- API availability >= 99.9%.
- Payment webhook processing completion < 60 s.

## 7) Global Financial Transactions

## 7.1 Payment architecture

- Use a multi-PSP strategy from day one.
- Primary global providers:
  - Stripe
  - PayPal
- South Africa-focused providers:
  - Yoco
  - Peach Payments
  - Payfast
- Optional South Africa/risk-diversification provider:
  - Ozow (pay-by-bank/EFT rail), and/or Paystack SA depending on commercial fit.
- Persist provider IDs and raw provider events for reconciliation across all providers.
- Internal double-entry ledger (in schema) as source of financial truth for app balances.
- Idempotent payment operations:
  - require `idempotency_key` at API layer
  - dedupe by `(provider, provider_event_id)` for webhooks

## 7.2 Provider orchestration and fallback

- Add a `Payment Orchestrator` inside Payment Service:
  - routes by country/currency/payment method/risk score/provider health.
  - retries only where provider semantics are safe.
  - can fail over to alternate provider if checkout creation fails.
- Suggested first routing policy:
  - `ZAR` + South Africa customers:
    - cards/wallet: Yoco or Peach Payments as preferred local rails.
    - EFT/open-banking/pay-by-bank: Payfast/Ozow path.
  - Non-SA/global:
    - Stripe and PayPal as primary checkout options.
- Keep provider adapters isolated:
  - `providers/stripe/*`
  - `providers/paypal/*`
  - `providers/yoco/*`
  - `providers/peach/*`
  - `providers/payfast/*`
  - `providers/ozow/*` (if enabled)
- Each adapter standardizes into one internal `PaymentAttempt` contract so upstream business logic stays provider-agnostic.

## 7.3 Financial safety controls

- Transaction state machine (`initiated -> processing -> succeeded/failed/...`).
- Exactly-once ledger posting by unique constraints and idempotent workers.
- Daily reconciliation job:
  - compare provider payouts/charges vs internal ledger deltas.
- Do not trust client amounts; compute server-side totals from canonical catalog/order rows.

## 7.4 Webhooks and settlement model

- Webhook ingestion endpoint per provider signature scheme:
  - verify signatures before processing.
  - store raw payload in `payment_webhook_events`.
  - ACK quickly, process async in queue workers.
- Maintain provider-specific settlement and payout windows in configuration.
- Reconciliation runs must be provider-aware:
  - payout timing differences
  - refund/dispute lifecycle differences
  - partial capture/refund support differences

## 8) Auditability and Compliance Readiness

## 8.1 Audit log model

- `audit_events` append-only table:
  - actor
  - action
  - target entity
  - before/after JSON snapshots
  - request metadata (ip, user agent, request id)
- Partitioned monthly for retention and query performance.

## 8.2 What to audit first

- Auth actions (login, failed login, MFA, password/security changes).
- Post lifecycle (create/edit/delete/moderation).
- Connection and messaging moderation events.
- Order/investment/payment status transitions.
- Admin actions and permission changes.

## 9) Security Architecture

## 9.1 Identity and access

- JWT access token + rotating refresh token or secure server sessions.
- Optional MFA for privileged roles.
- RBAC + ownership checks for all object access.
- RLS can be enabled later for sensitive multi-tenant data paths.
- Social sign-in support:
  - Google OAuth 2.0 / OIDC
  - Facebook Login
  - LinkedIn OAuth
- Account linking model:
  - one `users` record with multiple linked identities (`provider`, `provider_user_id`)
  - verified email merge rules to prevent duplicate-account sprawl
  - step-up verification when social provider email is missing/unverified

## 9.4 Verification features (user, business, marketplace trust)

- User verification levels:
  - `basic`: default onboarding
  - `verified`: identity or strong account proof completed
  - `trusted`: enhanced checks + strong history signals
- Verification signals stored and surfaced:
  - identity verification status
  - business verification status (registration/company docs)
  - payment method verification
  - behavioral trust metrics (disputes, abuse flags, completion history)
- Verification workflow:
  - submit verification package (ID/business docs)
  - asynchronous review queue + manual review path
  - audit all transitions and reviewer actions
- Where verification affects product behavior:
  - ranking boosts and trust badges
  - higher transaction/risk limits
  - access to premium actions (higher campaign budgets, larger funding asks)

## 9.5 End-to-end encrypted direct messaging (E2EE)

If E2EE is required, direct messaging should use a Signal-style protocol pattern.

- Recommended approach:
  - Protocol family: Signal protocol concepts (X3DH + Double Ratchet style model)
  - Client-side encryption/decryption only.
  - Server stores ciphertext and encrypted metadata only.
- Key model:
  - Identity key pair per user.
  - Signed prekeys + one-time prekeys per device.
  - Per-conversation/per-session ratcheting keys for forward secrecy.
- Multi-device support:
  - device-specific key bundles
  - sender keys/session fanout to each target device
  - secure device add/remove and key reset workflows
- Message pipeline with E2EE:
  - client encrypts payload (text/attachments key material)
  - server routes ciphertext packets via WebSocket/queue
  - recipient client decrypts and acknowledges
- Attachments under E2EE:
  - attachment encrypted client-side with random content key
  - encrypted file uploaded to object storage
  - encrypted content key sent in message envelope
- What server can still do:
  - transport, fanout, delivery status, abuse rate-limits, anti-spam controls
  - cannot read plaintext message content
- Important tradeoffs:
  - server-side full-text search on message content is not possible
  - content moderation is limited to metadata/signals or optional client-side reporting
  - legal/compliance discovery flows must be designed explicitly around E2EE constraints

### 9.5.1 Minimal DB additions for E2EE

Add tables in a future migration (not in current SQL yet):

- `user_devices`
  - `id`, `user_id`, `device_id`, `identity_public_key`, `signed_prekey`, `prekey_bundle_meta`, `created_at`, `revoked_at`
- `conversation_encryption_sessions`
  - session metadata per conversation/device pair
- `message_envelopes`
  - encrypted payload envelope fields (ciphertext, nonce, header, protocol_version)
- `message_receipts`
  - delivered/read receipts by device without exposing plaintext

### 9.5.2 Recommended rollout for E2EE

- Phase A:
  - keep current secure transport/storage model for MVP
  - implement device management and crypto primitives behind feature flags
- Phase B:
  - enable E2EE for 1:1 chats
  - validate multi-device reliability and backup/recovery UX
- Phase C:
  - extend to group chat and encrypted attachments at scale
  - add abuse-reporting workflow for user-submitted decrypted evidence

## 9.2 API and platform security

- TLS end-to-end.
- WAF and adaptive rate limits per IP/user/action.
- Input validation on all endpoints (schema-based).
- Parameterized queries only, no dynamic SQL without strict whitelists.
- CSRF protection for cookie-based auth flows.
- Secret rotation and environment-scoped keys.

## 9.3 Payment/webhook hardening

- Verify webhook signatures.
- Fast `2xx` ACK and async processing.
- Replay protection using timestamp + stored event IDs.
- Per-provider secret rotation and key-version support.
- Provider outage circuit breaker with graceful checkout fallback.

## 10) Observability and Operations

## 10.1 Telemetry

- Structured JSON logs with correlation ID.
- Traces across gateway -> API -> DB/queue/payment provider.
- Metrics:
  - request latency/error rates
  - DB slow queries
  - queue lag
  - webhook lag

## 10.2 Operational readiness

- Blue/green or rolling deployments.
- DB migration pipeline with backward-compatible rollout.
- Backups + PITR for PostgreSQL.
- Runbooks for:
  - payment incident
  - queue backlog
  - elevated error rates
  - failed migrations

## 11) Migration Plan: Mock Data to Production

## Phase 1 (Foundation, 2-4 weeks)

- Stand up API service + PostgreSQL + Valkey/Redis.
- Implement auth, profiles, basic feed reads/writes.
- Replace `AuthContext` localStorage auth with real API tokens/sessions.

## Phase 2 (Core social, 3-5 weeks)

- Connections, messaging, reactions/comments/bookmarks.
- Real pagination/cursors; remove in-memory feed mutations.
- Add audit events for social and auth.

## Phase 3 (Commerce + investments + campaigns, 4-6 weeks)

- Orders/bookings/reviews.
- Investment commitments and campaign lifecycle.
- Marketing campaign CRUD + metric ingest pipeline.

## Phase 4 (Payments + hardening, 4-8 weeks)

- Multi-provider payment integration (Stripe + PayPal + SA gateways) with routing and reconciliation.
- Ledger activation and reconciliation jobs.
- Security hardening, SLO-based performance tuning, load testing.

## 12) Load and Capacity Approach

- Start target: 5k DAU, 500-1,000 concurrent active sessions.
- Validate with staged load tests:
  - feed read burst
  - message fanout burst
  - webhook storm replay
- Scale knobs:
  - horizontal API autoscale
  - Valkey/Redis cluster
  - Postgres read replicas + partition tuning
  - queue consumer autoscaling

## 13) Decisions Locked by This Deep Dive

- PostgreSQL is canonical state store.
- Valkey/Redis is required for latency and rate control.
- Event-driven async processing is mandatory for reliability and throughput.
- Payments are multi-provider (Stripe + PayPal + SA gateways), idempotent, and reconciled against internal ledger.
- Audit trail is append-only and partitioned from day one.
- Authentication supports email/password and social login (Google/Facebook/LinkedIn) with account linking.
- Verification is a first-class trust system (identity, business, payment, behavior).

## 14) Recommended rollout path (best value without breaking the bank)

Recommended default approach:

- Build stack:
  - `NestJS + Fastify + PostgreSQL + Valkey + NATS`
- Auth:
  - Start with email/password + Google social login in phase 1.
  - Add Facebook/LinkedIn in phase 2 once onboarding funnel data confirms impact.
- Verification:
  - Launch lightweight verification first:
    - email/phone verification
    - business-domain and basic company checks
  - Add full KYC/KYB provider integrations only for higher-risk flows (large transactions/fundraising thresholds).
- Search:
  - Begin with PostgreSQL full-text for early stage.
  - Add OpenSearch when query volume/index size justifies it.
- Payments:
  - Start with two rails:
    - one global (Stripe or PayPal path)
    - one strong SA local path (Yoco or Peach/Payfast based on method mix)
  - Expand routing matrix after 60-90 days of payment analytics.
- Media/video strategy:
  - Launch with image-only media enabled.
  - Keep video contracts/schema/integration paths in code but disabled by feature flags.
  - Turn video on later per environment or per user tier once usage and revenue justify delivery costs.

Why this is the best balance:

- Limits up-front vendor spend.
- Keeps architecture production-grade and secure.
- Defers expensive complexity until data proves need.

### 14.1 Why launch with video turned off (but built in)

- Cost control:
  - Video delivery and storage are usually top cost drivers for social platforms.
  - Delaying video meaningfully reduces monthly burn during pre-revenue/early-revenue stages.
- Reliability:
  - Removes transcoding and heavy media pipelines from initial operational risk.
  - Faster incident response with a smaller production surface area.
- Product velocity:
  - Team can prioritize core retention loops (feed, messaging, transactions, network growth).
  - Avoids over-investing in expensive features before usage confirms demand.
- Low migration risk later:
  - Because video fields/routes are kept behind flags, enabling later is configuration-driven, not a major rewrite.

### 14.2 Implementation approach for video feature flags

- Add flags:
  - `media.video_upload_enabled`
  - `media.video_playback_enabled`
  - `media.video_transcode_enabled`
- Enforce flags consistently:
  - frontend hides upload/player controls when disabled
  - backend rejects video upload requests when disabled
  - workers skip video transcode queues when disabled
- Keep compatibility:
  - retain media model support for `image|video`
  - keep API fields stable so clients do not break when video is later enabled

## 15) Cost Model (monthly)

These are planning estimates, not invoices. Prices vary by region, tax, contract terms, and volume discounts.

### 14.1 Assumptions used for cost tables

- All values are monthly.
- Media-heavy social app with photos + short videos.
- Currency:
  - infrastructure/media tables in USD
  - payment fee examples in ZAR
- Local payment fees listed are generally ex-VAT (provider billing terms apply).

### 14.2 Core platform and infrastructure cost ranges (USD/month)

| Cost item | Lean MVP (5k MAU) | Growth (50k MAU) | Scale (250k+ MAU) | Notes |
|---|---:|---:|---:|---|
| API compute (NestJS/Fastify) | 60-180 | 250-1,000 | 2,000-8,000 | Horizontal scaling and HA increase cost quickly |
| PostgreSQL (managed + backups) | 80-300 | 500-2,500 | 4,000-20,000 | Read replicas + larger IOPS tiers drive growth spend |
| Valkey/Redis | 20-120 | 150-800 | 1,000-4,000 | Session/cache/rate-limit pressure grows with traffic |
| NATS/queue workers | 20-100 | 120-600 | 800-3,000 | Event fanout + webhook volume dependent |
| CDN/WAF/edge | 20-250 | 250-2,000 | 2,000-15,000 | Security tier + request volume |
| Observability (metrics/logs/traces) | 50-250 | 300-2,000 | 2,000-15,000 | Log retention is often a major hidden cost |
| Email/SMS/notifications | 20-150 | 150-1,500 | 1,500-12,000 | SMS/push providers are highly usage-driven |
| CI/CD and artifact storage | 10-120 | 50-500 | 300-2,000 | Build minutes + artifact retention |
| **Estimated subtotal** | **280-1,470** | **1,770-10,900** | **13,600-79,000** | Excludes payment processing and media delivery |

### 14.3 Media storage + delivery (photos and videos)

#### Photo and object media (Cloudflare R2 style model)

Reference unit prices used:
- Storage: `$0.015 / GB-month`
- Class A ops: `$4.50 / million`
- Class B ops: `$0.36 / million`
- Egress: `free` (R2 model)

| Media item | Example usage | Example cost |
|---|---:|---:|
| Photo/object storage | 2,000 GB | $30 |
| Class A operations | 5,000,000 ops | $22.50 |
| Class B operations | 50,000,000 ops | $18.00 |
| **R2-style subtotal** |  | **$70.50** |

#### Video (Cloudflare Stream style model)

Reference unit prices used:
- Storage: `$5 / 1,000 minutes stored`
- Delivery: `$1 / 1,000 minutes delivered`

| Video item | Example usage | Example cost |
|---|---:|---:|
| Minutes stored | 40,000 min | $200 |
| Minutes delivered | 2,000,000 min | $2,000 |
| **Video subtotal** |  | **$2,200** |

Practical note:
- Video delivery often becomes one of the largest costs in social apps.
- To reduce cost, keep multiple quality profiles but aggressively manage retention, autoplay behavior, and cold-archive strategy for older videos.

### 14.4 Transaction processing cost examples (ZAR)

Example assumptions:
- Monthly GMV: `R1,000,000`
- Average order size: `R500`
- Approx. transactions: `2,000`

| Provider / route | Example fee model | Estimated monthly fee on example GMV |
|---|---|---:|
| Yoco (online, local cards) | ~2.55% to 2.95% | `R25,500 - R29,500` |
| Paystack ZA (local cards) | 2.9% + R1 | `~R31,000` |
| Paystack ZA (EFT) | 2.0% | `~R20,000` |
| Payfast (cards) | 3.2% + R2 | `~R36,000` |
| Payfast (Instant EFT) | 2.0% (min applies) | `~R20,000` (before minimum edge cases) |
| PayPal ZA merchant (regional table) | 4.9% + fixed fee | `~R49,000 + fixed-fee component` |

Important:
- Real effective fee depends on method mix (cards vs EFT vs BNPL), refunds, disputes/chargebacks, and payout fees.
- For South Africa, routing more eligible traffic to EFT rails can reduce blended cost.

### 14.5 Full monthly run-rate examples (including media, excluding payment fees)

| Scenario | Infra/platform subtotal | Media subtotal (photo + video example) | Estimated total before payment fees |
|---|---:|---:|---:|
| Lean MVP | $280 - $1,470 | ~$300 - $1,200 | **$580 - $2,670** |
| Growth | $1,770 - $10,900 | ~$1,500 - $6,000 | **$3,270 - $16,900** |
| Scale | $13,600 - $79,000 | ~$8,000 - $60,000 | **$21,600 - $139,000** |

### 14.6 Cost-control levers (highest impact first)

- Media:
  - Cap max video duration/bitrate by user tier.
  - Keep poster images + lower autoplay defaults.
  - Archive old/unpopular video assets aggressively.
- Database:
  - Enforce query budgets and index hygiene early.
  - Move heavy analytics out of OLTP path.
- Observability:
  - Sample traces and set log retention by severity.
- Payments:
  - Route by cheapest compliant rail (EFT where possible).
  - Use provider health checks + failover to protect conversion.

## 16) Revenue Feasibility and Monetization Plan (monthly)

This section records how Vendrome can pay monthly operating costs using transaction and ad-driven revenue.

### 16.1 Recommended revenue streams

| Revenue stream | How it works | Suggested startup pricing | Notes |
|---|---|---|---|
| Marketplace transactions (product/service orders) | Platform takes a % per successful transaction | `3% to 6%` take rate (plus provider fees passed through) | Best early, predictable revenue if GMV grows |
| Crowdfunding success fee | Fee on successful funds raised | `4% to 6%` platform fee | Industry benchmark is around 5% platform fee plus processing |
| Investment facilitation fee | Fee on closed investment commitments/deals | `1% to 3%` or flat deal fee | Must confirm local legal/regulatory boundaries |
| Promotions in The Hub / marketing center | Paid placement, sponsored posts, audience targeting | Tiered plans (e.g., R499 / R1,999 / custom) | High-margin software revenue stream |
| Panel ads (AdSense or ad network) | Display ads in designated UI panels | Usage-driven (CPM/CPC) | Good supplementary revenue, usually not primary in early stage |
| Verification paid tier | Small monthly fee for verified/business-trust perks | Example `R49 to R199/month` | Improves trust and adds recurring revenue |

### 16.2 Is this enough to cover bills?

Use this break-even rule:

- Required monthly platform revenue (before tax) >= monthly run cost + payment provider fixed costs + risk buffer.

Given your no-video startup range from this plan:

- Monthly run cost target to cover: roughly `$700 to $2,200` (no-video lean path).

### 16.3 Example monthly feasibility scenarios (ZAR)

Assumptions for illustration:

- Marketplace GMV: total product/service transaction volume.
- Crowdfunding volume: successfully funded amount.
- Promotion plans: paid sponsored placements/campaign subscriptions.
- Verification: paid trust-tier subscriptions.
- Ads: one panel inventory only (AdSense-style supplemental revenue).

| Scenario | Marketplace rev | Crowdfunding rev | Promotions rev | Verification rev | Ads rev | Total monthly revenue |
|---|---:|---:|---:|---:|---:|---:|
| Conservative | R18,000 | R7,500 | R8,000 | R2,500 | R2,000 | **R38,000** |
| Base | R40,000 | R18,000 | R22,000 | R7,500 | R6,000 | **R93,500** |
| Strong growth | R95,000 | R45,000 | R60,000 | R20,000 | R15,000 | **R235,000** |

Interpretation:

- Conservative can already be enough for lean monthly operating bills in many startup setups.
- Base and above usually supports reinvestment (team, growth, reliability) if payment-fee leakage and refunds are managed.

### 16.4 Practical monetization recommendation (best value path)

Recommended order to launch monetization:

1. Transaction take rates (marketplace + crowdfunding) as primary revenue engine.
2. Promotions/sponsored placements as high-margin secondary engine.
3. Paid verification tier as recurring trust revenue.
4. Ads panel as supplemental revenue only.

Why this order:

- Transaction and promotion revenue scales directly with platform activity and business intent.
- Verification subscriptions support trust and reduce abuse while adding recurring cash flow.
- Ads alone are usually too volatile to be the main source early on.

### 16.5 Risks and controls

| Risk | Impact | Mitigation |
|---|---|---|
| Payment fees/refunds eat margin | Net revenue underperforms | Optimize rail routing (EFT where suitable), fee-aware pricing |
| Low ad yield | Ads fail to cover meaningful costs | Treat ads as supplemental, not primary |
| Abuse/fraud in transactions | Chargebacks, trust damage | Verification gates, risk rules, velocity checks, auditability |
| Overpricing early | Reduced conversion and retention | Start low-mid take rates, adjust by cohort data |
| Regulatory constraints (investment workflows) | Legal risk or blocked revenue | Jurisdiction-specific legal review before charging investment fees |

## 17) External References Used

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Stream pricing: https://developers.cloudflare.com/stream/pricing/
- Google AdSense revenue share: https://support.google.com/adsense/answer/180195
- Kickstarter fees: https://help.kickstarter.com/hc/en-us/articles/115005028634-What-are-the-fees
- Indiegogo fees and pricing: https://support.indiegogo.com/hc/en-us/articles/205138007-Fees-Pricing-for-Campaigners-How-much-does-Indiegogo-cost
- Fastify benchmark page: https://fastify.dev/benchmarks/
- Node.js release and LTS guidance: https://nodejs.org/en/about/releases
- Valkey project overview: https://valkey.io/
- NATS concepts overview: https://docs.nats.io/nats-concepts/what-is-nats
- NATS security model: https://docs.nats.io/nats-concepts/security
- Keycloak project site: https://www.keycloak.org/
- Google Identity OAuth docs: https://developers.google.com/identity/protocols/oauth2
- Facebook Login docs: https://developers.facebook.com/docs/facebook-login/
- LinkedIn Sign In docs: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin
- MinIO repository/license: https://github.com/minio/minio
- OpenTelemetry overview: https://opentelemetry.io/docs/what-is-opentelemetry/
- PostgreSQL partitioning docs: https://www.postgresql.org/docs/current/ddl-partitioning.html
- Redis eviction policies: https://redis.io/docs/latest/develop/reference/eviction/
- Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests
- Stripe webhooks guidance: https://docs.stripe.com/webhooks
- Yoco pricing: https://www.yoco.com/za/pricing
- PayPal Checkout docs: https://developer.paypal.com/docs/checkout/
- PayPal merchant fees (South Africa table): https://www.paypal.com/za/business/paypal-business-fees
- PayPal Payouts API docs: https://developer.paypal.com/docs/payouts/standard/integrate-api/
- Yoco Developer Hub: https://developer.yoco.com/
- Yoco Checkout API reference: https://developer.yoco.com/api-reference/checkout-api
- Yoco online payments webhook guidance: https://developer.yoco.com/guides/online-payments
- Peach Payments webhook docs: https://developer.peachpayments.com/docs/reference-webhooks
- Peach Payments Payouts API docs: https://developer.peachpayments.com/docs/payouts-api-1
- Paystack South Africa pricing: https://paystack.com/za/pricing
- Payfast merchant rates (cards + EFT): https://payfast.io/merchant-rates
- Payfast ITN callback guidance: https://support.payfast.help/portal/en/kb/articles/why-am-i-not-receiving-the-itn-callback-20-9-2022
- Payfast payment method examples: https://payfast.io/features/payment-methods/
- Ozow product overview (payments/refunds/payouts): https://ozow.com/
- Paystack South Africa launch details: https://paystack.com/blog/company-news/sa-launch
- NIST SP 800-63B-4 (authentication guidance): https://www.nist.gov/publications/nist-sp-800-63b-4digital-identity-guidelines-authentication-and-authenticator
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
