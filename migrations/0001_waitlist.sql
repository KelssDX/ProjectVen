CREATE TABLE IF NOT EXISTS waitlist_signups (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 2 AND 100),
  role TEXT NOT NULL CHECK (
    role IN ('entrepreneur', 'business', 'investor', 'professional', 'partner', 'other')
  ),
  organisation TEXT CHECK (organisation IS NULL OR length(organisation) <= 120),
  country TEXT CHECK (country IS NULL OR length(country) <= 80),
  interest TEXT NOT NULL CHECK (
    interest IN ('networking', 'marketplace', 'capital', 'mentorship', 'growth', 'exploring')
  ),
  profile_url TEXT CHECK (profile_url IS NULL OR length(profile_url) <= 300),
  note TEXT CHECK (note IS NULL OR length(note) <= 600),
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'vendrome-coming-soon',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (
    status IN ('waiting', 'invited', 'joined', 'unsubscribed')
  )
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at
  ON waitlist_signups (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_role_interest
  ON waitlist_signups (role, interest);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_status
  ON waitlist_signups (status);
