-- Capture the visitor's IP-derived country separately from the country they
-- choose in the form. A traveller or VPN user can select their true country
-- while ip_country records where the request actually originated, so the two
-- values can be compared later.
ALTER TABLE waitlist_signups ADD COLUMN ip_country TEXT
  CHECK (ip_country IS NULL OR length(ip_country) <= 80);
