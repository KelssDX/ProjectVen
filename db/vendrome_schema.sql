-- Vendrome production schema (PostgreSQL 15+)
-- Created: 2026-02-24

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================
-- Enums
-- =========================

CREATE TYPE user_type AS ENUM ('sme', 'entrepreneur', 'investor', 'mentor', 'admin');
CREATE TYPE verification_level AS ENUM ('basic', 'verified', 'trusted');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE post_visibility AS ENUM ('public', 'connections', 'private');
CREATE TYPE post_type AS ENUM (
  'update',
  'product',
  'service',
  'idea',
  'crowdfunding',
  'investment',
  'mentorship',
  'promo'
);
CREATE TYPE media_type AS ENUM ('image', 'video', 'document');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'interest', 'share', 'repost');
CREATE TYPE order_type AS ENUM ('product', 'service');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('initiated', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE campaign_type AS ENUM ('banner', 'featured', 'newsletter', 'sponsored');
CREATE TYPE calendar_source AS ENUM ('vendrom', 'google', 'microsoft');
CREATE TYPE calendar_event_type AS ENUM ('meeting', 'deadline', 'event', 'booking', 'reminder');
CREATE TYPE meeting_mode AS ENUM ('virtual', 'physical');
CREATE TYPE mentorship_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');
CREATE TYPE notification_type AS ENUM ('system', 'message', 'connection', 'payment', 'marketing', 'security');
CREATE TYPE audit_actor_type AS ENUM ('user', 'service', 'admin');
CREATE TYPE moderation_status AS ENUM ('pending', 'under_review', 'actioned', 'dismissed');

-- =========================
-- Utility trigger
-- =========================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- Identity + User
-- =========================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  user_type user_type NOT NULL,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_level verification_level NOT NULL DEFAULT 'basic',
  ven_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  business_score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_verification_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge)
);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_suspicious ON auth_sessions(is_suspicious) WHERE is_suspicious = TRUE;

-- =========================
-- Profiles
-- =========================

CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  industry TEXT NOT NULL,
  sub_industry TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  website TEXT,
  founded_year INTEGER,
  team_size TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('idea', 'seed', 'early', 'growth', 'established')),
  funding_needed BOOLEAN NOT NULL DEFAULT FALSE,
  funding_amount NUMERIC(18,2),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  views BIGINT NOT NULL DEFAULT 0,
  connections_count BIGINT NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_business_profiles_industry ON business_profiles(industry);
CREATE INDEX idx_business_profiles_stage ON business_profiles(stage);
CREATE INDEX idx_business_profiles_location ON business_profiles(country, city);
CREATE INDEX idx_business_profiles_desc_fts
  ON business_profiles USING GIN (to_tsvector('english', coalesce(description, '') || ' ' || coalesce(company_name, '')));

CREATE TABLE business_profile_skills (
  profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  PRIMARY KEY (profile_id, skill)
);

CREATE TABLE business_profile_looking_for (
  profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  PRIMARY KEY (profile_id, item)
);

CREATE TABLE business_profile_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_profile_social_links (
  profile_id UUID PRIMARY KEY REFERENCES business_profiles(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- Social graph + messaging
-- =========================

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_connection_users_different CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX uniq_connection_pair
  ON connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX idx_connections_requester ON connections(requester_id, status);
CREATE INDEX idx_connections_addressee ON connections(addressee_id, status);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID UNIQUE REFERENCES connections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at DESC);

CREATE TABLE message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX idx_message_reads_user ON message_reads(user_id, read_at DESC);

-- =========================
-- Posts + feed
-- =========================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type post_type NOT NULL,
  content TEXT NOT NULL,
  visibility post_visibility NOT NULL DEFAULT 'public',
  likes_count BIGINT NOT NULL DEFAULT 0,
  loves_count BIGINT NOT NULL DEFAULT 0,
  interests_count BIGINT NOT NULL DEFAULT 0,
  bookmarks_count BIGINT NOT NULL DEFAULT 0,
  reposts_count BIGINT NOT NULL DEFAULT 0,
  comments_count BIGINT NOT NULL DEFAULT 0,
  shares_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_created ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_type_created ON posts(type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_visibility_created ON posts(visibility, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_content_fts ON posts USING GIN (to_tsvector('english', coalesce(content, '')));

CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type media_type NOT NULL,
  media_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_media_post ON post_media(post_id, sort_order);

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON post_reactions(user_id);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_post_comments_post_created ON post_comments(post_id, created_at DESC);

CREATE TABLE post_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_post_content_versions_post_created ON post_content_versions(post_id, created_at DESC);

CREATE TABLE post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status moderation_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
CREATE INDEX idx_post_reports_status_created ON post_reports(status, created_at DESC);

CREATE TABLE post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_post_bookmarks_user_created ON post_bookmarks(user_id, created_at DESC);

CREATE TABLE post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_shares_post ON post_shares(post_id);

-- typed post extensions
CREATE TABLE post_products (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  quantity INTEGER
);

CREATE TABLE post_services (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('hourly', 'project', 'monthly')),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('immediate', '1-week', '2-weeks', '1-month'))
);

CREATE TABLE post_crowdfunding (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  target_amount NUMERIC(18,2) NOT NULL,
  raised_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  backers_count INTEGER NOT NULL DEFAULT 0,
  days_left INTEGER NOT NULL,
  min_investment NUMERIC(18,2) NOT NULL,
  max_investment NUMERIC(18,2),
  currency CHAR(3) NOT NULL,
  equity TEXT
);

CREATE TABLE post_investment_offers (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  amount_min NUMERIC(18,2) NOT NULL,
  amount_max NUMERIC(18,2) NOT NULL
);

CREATE TABLE post_investment_offer_stages (
  post_id UUID NOT NULL REFERENCES post_investment_offers(post_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  PRIMARY KEY (post_id, stage)
);

CREATE TABLE post_investment_offer_industries (
  post_id UUID NOT NULL REFERENCES post_investment_offers(post_id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  PRIMARY KEY (post_id, industry)
);

CREATE TABLE post_investment_requests (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  amount_min NUMERIC(18,2) NOT NULL,
  amount_max NUMERIC(18,2) NOT NULL,
  timeline TEXT
);

CREATE TABLE post_investment_request_stages (
  post_id UUID NOT NULL REFERENCES post_investment_requests(post_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  PRIMARY KEY (post_id, stage)
);

CREATE TABLE post_investment_request_industries (
  post_id UUID NOT NULL REFERENCES post_investment_requests(post_id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  PRIMARY KEY (post_id, industry)
);

CREATE TABLE post_mentorship_requests (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  commitment TEXT NOT NULL CHECK (commitment IN ('full-time', 'part-time', 'ad-hoc')),
  duration TEXT NOT NULL
);

CREATE TABLE post_mentorship_expertise (
  post_id UUID NOT NULL REFERENCES post_mentorship_requests(post_id) ON DELETE CASCADE,
  expertise TEXT NOT NULL,
  PRIMARY KEY (post_id, expertise)
);

CREATE TABLE post_promotions (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  discount_percent NUMERIC(5,2) NOT NULL,
  promo_code TEXT NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL
);

CREATE TABLE post_pitch_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  video_url TEXT,
  deck_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE post_pitch_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_asset_id UUID NOT NULL REFERENCES post_pitch_assets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL
);

CREATE TABLE post_pitch_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_asset_id UUID NOT NULL REFERENCES post_pitch_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);

-- =========================
-- Marketplace + reviews
-- =========================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  order_type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer_created ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_seller_created ON orders(seller_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price >= 0),
  currency CHAR(3) NOT NULL
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  status booking_status NOT NULL DEFAULT 'pending',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  price NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_client_start ON bookings(client_id, start_at DESC);
CREATE INDEX idx_bookings_provider_start ON bookings(provider_id, start_at DESC);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reviewer_id)
);

CREATE INDEX idx_reviews_post_created ON reviews(post_id, created_at DESC);

-- =========================
-- Investments
-- =========================

CREATE TABLE investment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  currency CHAR(3) NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL,
  raised_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  min_investment NUMERIC(18,2) NOT NULL,
  max_investment NUMERIC(18,2),
  status campaign_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE investment_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES investment_campaigns(id) ON DELETE CASCADE,
  investor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status payment_status NOT NULL DEFAULT 'initiated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investment_commitments_campaign_created
  ON investment_commitments(campaign_id, created_at DESC);

-- =========================
-- Marketing campaigns
-- =========================

CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type campaign_type NOT NULL,
  budget NUMERIC(18,2) NOT NULL CHECK (budget >= 0),
  status campaign_status NOT NULL DEFAULT 'draft',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_marketing_campaigns_user_created ON marketing_campaigns(user_id, created_at DESC);
CREATE INDEX idx_marketing_campaigns_status_dates ON marketing_campaigns(status, start_at, end_at);

-- =========================
-- Outbox (CDC/event publishing)
-- =========================

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_outbox_unpublished ON outbox_events(published_at, occurred_at) WHERE published_at IS NULL;
CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id, occurred_at DESC);

CREATE TABLE marketing_campaign_target_industries (
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  PRIMARY KEY (campaign_id, industry)
);

CREATE TABLE marketing_campaign_target_locations (
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  PRIMARY KEY (campaign_id, location)
);

CREATE TABLE marketing_campaign_target_user_types (
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  target_user_type user_type NOT NULL,
  PRIMARY KEY (campaign_id, target_user_type)
);

-- =========================
-- Mentorship
-- =========================

CREATE TABLE mentorship_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mentee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  status mentorship_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_mentor_mentee_different CHECK (mentor_user_id <> mentee_user_id)
);

CREATE INDEX idx_mentorship_mentor_status ON mentorship_relationships(mentor_user_id, status);
CREATE INDEX idx_mentorship_mentee_status ON mentorship_relationships(mentee_user_id, status);

-- =========================
-- Calendar
-- =========================

CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider calendar_source NOT NULL,
  external_account_id TEXT,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source calendar_source NOT NULL DEFAULT 'vendrom',
  event_type calendar_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  meeting_mode meeting_mode,
  meeting_link TEXT,
  source_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_user_start ON calendar_events(user_id, start_at);
CREATE INDEX idx_calendar_events_type_start ON calendar_events(event_type, start_at);

-- =========================
-- Payments + ledger
-- =========================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  status payment_status NOT NULL DEFAULT 'initiated',
  source_type TEXT NOT NULL, -- order | booking | investment | campaign | payout
  source_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_user_created ON payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payment_transactions_source ON payment_transactions(source_type, source_id);
CREATE INDEX idx_payment_transactions_provider_id ON payment_transactions(provider, provider_payment_id);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  currency CHAR(3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL, -- payment | refund | payout | adjustment
  reference_id UUID NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reference_type, reference_id)
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  entry_type ledger_entry_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);

-- =========================
-- Notifications
-- =========================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- =========================
-- Audit trail (partitioned)
-- =========================

CREATE TABLE audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  actor_type audit_actor_type NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  request_id TEXT,
  ip_address INET,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create one initial partition. Add monthly partitions via migration job.
CREATE TABLE audit_events_2026_02 PARTITION OF audit_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_events_action_created ON audit_events(action, created_at DESC);

-- =========================
-- Triggers
-- =========================

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_business_profiles_updated_at
BEFORE UPDATE ON business_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_connections_updated_at
BEFORE UPDATE ON connections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_post_comments_updated_at
BEFORE UPDATE ON post_comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_investment_campaigns_updated_at
BEFORE UPDATE ON investment_campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_investment_commitments_updated_at
BEFORE UPDATE ON investment_commitments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_marketing_campaigns_updated_at
BEFORE UPDATE ON marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mentorship_relationships_updated_at
BEFORE UPDATE ON mentorship_relationships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calendar_integrations_updated_at
BEFORE UPDATE ON calendar_integrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

