# Vendrome Waitlist Operations

This guide covers the production resources required by the `prod` branch and the safe handling of waitlist submissions.

## Production resources

Create these resources in the same Cloudflare account and Pages project that will serve `vendrome.com`:

| Resource | Name or binding |
| --- | --- |
| Pages project | Recommended: `vendrome-coming-soon` |
| Production branch | `prod` |
| D1 database | Recommended: `vendrome-waitlist` |
| Pages D1 binding | `WAITLIST_DB` |
| Public build variable | `VITE_TURNSTILE_SITE_KEY` |
| Encrypted Pages secret | `TURNSTILE_SECRET_KEY` |

The site key is intentionally public and appears in browser code. The secret key must exist only in Cloudflare Pages project secrets and in an ignored local `.dev.vars` file.

## Cloudflare Pages build settings

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Production branch: `prod`
- Node version: `22`
- Automatic production deployments: enabled
- Preview deployments for non-production branches: disabled / `None`

Disabling preview deployments is important: the repository contains an unfinished application on other branches, and those branches must not be published to public preview URLs.

## Create the database and schema

The migration is stored at `migrations/0001_waitlist.sql`.

Dashboard route:

1. Open **Cloudflare Dashboard → Storage & databases → D1 SQL database**.
2. Create `vendrome-waitlist`.
3. Open its SQL console and apply `migrations/0001_waitlist.sql`.
4. Open the Pages project settings and add a D1 binding named `WAITLIST_DB` pointing to that database.

CLI route after Cloudflare authentication:

```powershell
npx wrangler d1 create vendrome-waitlist
npx wrangler d1 execute vendrome-waitlist --remote --file .\migrations\0001_waitlist.sql
```

If Wrangler offers to insert the D1 binding in `wrangler.jsonc`, accept it and commit the generated non-secret database identifier to `prod`.

## Configure Turnstile

1. In Cloudflare, create a Turnstile widget for `vendrome.com`.
2. Add `www.vendrome.com` and the Pages production hostname used during final testing.
3. Set the widget site key as the Pages build variable `VITE_TURNSTILE_SITE_KEY`.
4. Set the widget secret key as the encrypted Pages secret `TURNSTILE_SECRET_KEY`.
5. Trigger a fresh deployment after adding or changing the public site key because Vite embeds it at build time.

The Pages Function validates every token with Cloudflare's Siteverify API. A browser-side Turnstile success without server verification is not accepted.

## Local configuration

- Use Cloudflare's published test site key in `VITE_TURNSTILE_SITE_KEY`.
- Copy `.dev.vars.example` to `.dev.vars` for the published test secret.
- Never use the live D1 binding for local write tests.
- Use a separate local or preview D1 database and apply the same migration before testing submissions.

## Review signups

Useful read-only queries:

```sql
SELECT COUNT(*) AS total_signups FROM waitlist_signups;

SELECT role, COUNT(*) AS total
FROM waitlist_signups
GROUP BY role
ORDER BY total DESC;

SELECT interest, COUNT(*) AS total
FROM waitlist_signups
GROUP BY interest
ORDER BY total DESC;

SELECT id, email, full_name, role, organisation, country, interest, created_at, status
FROM waitlist_signups
ORDER BY created_at DESC
LIMIT 100;
```

Do not paste waitlist exports into issues, public chats, logs, or the Git repository. Store exports only in an owner-approved, access-controlled location.

Note on `country`: if the visitor leaves the field blank, the API fills it from Cloudflare's IP geolocation (`CF-IPCountry`, rendered as an English country name). A manually entered value always wins, and unknown/Tor origins stay `NULL`.

## Update a signup status

Use the signup `id`, not an unescaped email value:

```sql
UPDATE waitlist_signups
SET status = 'invited'
WHERE id = 'SIGNUP_UUID';
```

Allowed statuses are `waiting`, `invited`, `joined`, and `unsubscribed`.

## Incident and rollback basics

- If spam or a form defect appears, disable the Pages Function route or temporarily remove the D1 binding; the endpoint will fail closed without exposing data.
- Roll back the page from **Pages project → Deployments** by selecting the last known good production deployment.
- Rotate the Turnstile secret immediately if it is ever disclosed.
- Use D1 Time Travel/backups from Cloudflare for accidental data changes; do not repair production by running unreviewed local scripts.
