# Vendrome Production Coming-Soon Plan

Status: Plan complete; implementation not yet started  
Production branch: `prod` (created from clean `main`)  
Target domain: `vendrome.com`  
Hosting target: Cloudflare Pages with Git-based automatic deployments

## 1. Goal

Publish a polished, fast, mobile-friendly Vendrome coming-soon experience without exposing the unfinished platform. The public site will explain Vendrome at a high level and collect useful, consented waitlist details from entrepreneurs, businesses, investors, professionals, potential users, and partners.

The unfinished application must not be accessible from the production deployment. Only the coming-soon experience and its waitlist API will be included in the deployed build.

## 2. Confirmed approach

- Keep all current feature-branch work untouched.
- Use a long-lived `prod` branch based on the clean `main` branch.
- Give `prod` its own dedicated coming-soon entry point. It will not import or expose the dashboard, authentication, marketplace, messages, or other unfinished application routes.
- Deploy the Vite production output (`dist`) through Cloudflare Pages.
- Configure Cloudflare Pages so `prod` is the only production branch.
- Disable automatic preview deployments for non-production branches. This prevents pushes to `main` and feature branches from publishing the unfinished application to public `*.pages.dev` preview URLs.
- Store waitlist submissions in a dedicated Cloudflare D1 database through a same-origin Pages Function.
- Protect the form with a honeypot, server-side validation, duplicate handling, and Cloudflare Turnstile with mandatory server-side token verification.
- Add `vendrome.com` and `www.vendrome.com`, with one canonical host redirecting to the other.

## 3. Visual and content direction

The page will build on Vendrome's current design language rather than introducing an unrelated launch theme:

- Pale stone and porcelain surfaces over deep slate/space sections.
- Vendrome's cyan, blue, and violet energy gradient.
- The existing Vendrome mark and the project's sculptural/orbital visual motifs.
- Bold editorial typography, generous spacing, soft depth, and restrained motion.
- A strong opening statement around **the social economy** and a clear `Join the waitlist` action.
- Motion that feels premium but respects `prefers-reduced-motion` and does not make the first load heavy.

Proposed page structure:

1. Minimal navigation with Vendrome identity and a waitlist CTA.
2. Hero: `The social economy is taking shape.` / `Vendrome is coming soon.`
3. Short explanation: a verified ecosystem where people connect, trade, learn, raise, invest, and grow.
4. Audience/pillar strip: Network, Marketplace, Capital, Mentorship, and Growth.
5. Waitlist section with a compact role-aware form.
6. Privacy reassurance and a simple footer.

Final wording will avoid promising unfinished features or launch dates that have not been confirmed.

## 4. Waitlist experience

### Proposed form fields

| Field | Requirement | Purpose |
| --- | --- | --- |
| Full name | Required | Identify the person joining |
| Email address | Required | Primary waitlist contact and duplicate key |
| `I am a...` role | Required | Entrepreneur, business, investor, professional/user, partner, or other |
| Organisation/business | Optional | Better audience understanding |
| Country/region | Optional | Launch and community planning |
| Main interest | Required | Networking, marketplace, funding/investing, mentorship, marketing/growth, or exploring |
| Website or LinkedIn | Optional | Context for businesses, founders, and investors |
| Short note | Optional | What the person hopes to find or contribute |
| Contact consent | Required | Clear consent to receive Vendrome launch/waitlist updates |

We will deliberately not collect passwords, financial details, identity documents, or other sensitive information.

### Submission behavior

- Submit to `POST /api/waitlist` on the same domain.
- Validate and normalize every field on the server; client validation is only for user experience.
- Verify a Turnstile token on the server before storing the submission.
- Keep email unique and treat a repeat submission as a friendly `You are already on the list` success rather than an error.
- Return clear, accessible success and error states without a page refresh.
- Never expose the D1 database or Turnstile secret to browser code.
- Do not store raw IP addresses. Use Cloudflare/Turnstile only for anti-abuse checks.

### D1 table outline

`waitlist_signups`

- `id` — generated UUID, primary key
- `email` — normalized email, unique
- `full_name`
- `role`
- `organisation` — nullable
- `country` — nullable
- `interest`
- `profile_url` — nullable
- `note` — nullable and length-limited
- `consent_at` — UTC timestamp
- `created_at` — UTC timestamp
- `source` — fixed launch-page source value
- `status` — defaults to `waiting`

A versioned SQL migration will create the table and useful indexes. A short admin note will document how to count, review, and export signups safely through D1/Wrangler.

## 5. Implementation tasks

### Phase A — Branch and plan

- [x] Inspect current branch and working-tree safety.
- [x] Confirm clean `main` as the base for production work.
- [x] Create an isolated `prod` worktree so existing feature changes remain untouched.
- [x] Review the current Vendrome landing page, palette, logo assets, typography, and visual motifs.
- [x] Review current Cloudflare Pages, Git branch controls, custom-domain, D1, and Turnstile guidance.
- [x] Commit this plan as the first `prod` commit.

### Phase B — Dedicated launch-page build

- [ ] Add a dedicated production coming-soon page and styles.
- [ ] Reuse approved existing Vendrome assets; optimize any images used.
- [ ] Ensure unfinished application routes and code are not included in the deployed entry bundle.
- [ ] Route all non-API browser paths back to the coming-soon page.
- [ ] Add responsive behavior for small phones through large desktop screens.
- [ ] Add accessible semantics, labels, focus states, keyboard flow, and reduced-motion behavior.
- [ ] Add SEO/social metadata, favicon, canonical URL, theme color, and a useful no-JavaScript fallback.
- [ ] Add production security and caching headers compatible with Turnstile.

### Phase C — Functional waitlist

- [ ] Add the client-side form and accessible status messaging.
- [ ] Add a same-origin Cloudflare Pages Function at `/api/waitlist`.
- [ ] Add strict server validation, field length limits, allow-listed role/interest values, and duplicate handling.
- [ ] Add a hidden honeypot and Turnstile integration.
- [ ] Add the D1 migration for `waitlist_signups`.
- [ ] Add local/test configuration with Cloudflare's published Turnstile test keys; keep live secrets out of Git.
- [ ] Add concise privacy/consent copy and link to a privacy notice or launch privacy section.
- [ ] Document signup review/export steps.

### Phase D — Verification

- [ ] Run TypeScript, lint, and production build checks.
- [ ] Test the Pages Function locally with a local D1 database.
- [ ] Test valid, invalid, duplicate, bot-field, expired-token, and server-error submission paths.
- [ ] Verify no dashboard/auth/unfinished routes are present in or reachable from the production build.
- [ ] Inspect the page visually at mobile, tablet, laptop, and wide-desktop sizes.
- [ ] Check keyboard navigation, contrast, reduced motion, and basic screen-reader announcements.
- [ ] Check metadata and social sharing preview assets.
- [ ] Review final copy with the owner.

### Phase E — GitHub and Cloudflare launch

- [ ] Commit implementation changes to `prod`.
- [ ] Push `prod` to GitHub.
- [ ] In Cloudflare, create a Git-integrated Pages project for `KelssDX/ProjectVen`.
- [ ] Set production branch to `prod`.
- [ ] Set build command to `npm run build` and output directory to `dist`.
- [ ] Set a supported Node version for Vite builds (planned: Node 22).
- [ ] Disable automatic preview deployments for all non-production branches.
- [ ] Create the production D1 database (planned name: `vendrome-waitlist`).
- [ ] Apply the migration and bind the database to the Pages project as `WAITLIST_DB`.
- [ ] Create a Turnstile widget for `vendrome.com` and the Pages preview/production host used for launch testing.
- [ ] Add the public Turnstile site key as a build variable and the secret key as a Cloudflare secret.
- [ ] Deploy first to the generated `*.pages.dev` production URL and run a live smoke test.
- [ ] Add `vendrome.com` as the custom apex domain.
- [ ] Add `www.vendrome.com` and configure the canonical redirect.
- [ ] Confirm HTTPS, DNS, the final waitlist submission, and automatic deployment from a small follow-up `prod` commit.

## 6. Where the owner is needed

| When | Owner action/decision | Why it is needed |
| --- | --- | --- |
| Before final copy lock | Confirm the one-sentence Vendrome description and whether `Est. 2026` should appear | Avoid publishing an inaccurate positioning or date |
| Before privacy copy lock | Provide the legal/business name, country of operation, privacy contact email, and desired data-retention period | Required for credible consent and privacy wording |
| Before live form launch | Confirm whether waitlist members may receive only launch updates or also ongoing marketing | Determines the consent language and use of the data |
| At GitHub connection | Approve/install the Cloudflare GitHub application for `KelssDX/ProjectVen` if it is not already authorised | Cloudflare needs repository access for automatic builds |
| At Cloudflare setup | Sign in or approve CLI/browser access to the Cloudflare account that owns `vendrome.com` | The project, D1 database, bindings, secrets, and domains must be created in the owner's account |
| At final review | Approve the page on the temporary `*.pages.dev` URL before attaching the domain | Prevents an unapproved page from replacing the domain destination |
| After launch | Decide who may access/export the waitlist and whether email/Slack notifications are needed | Protects personal data and defines the follow-up workflow |

If an immediate email notification is desired for every signup, that will be a small optional follow-up. The first release will make D1 the source of truth so form reliability is not dependent on an email provider.

## 7. Cloudflare configuration notes

- Cloudflare Pages supports GitHub-based automatic deployments and lets us select a non-default production branch. Production will explicitly be `prod`.
- Preview builds must be set to `None`/disabled because otherwise non-production branches may be deployed automatically.
- Since `vendrome.com` is the apex domain, it must be an active zone in the same Cloudflare account as the Pages project. Because the domain was purchased through Cloudflare, this will usually already be true, but we will verify it.
- The custom domain must be added from the Pages project's **Custom domains** flow; manually creating only a CNAME is not sufficient.
- Turnstile is not complete with a browser widget alone. Every token must be verified from the Pages Function using the secret and Cloudflare's Siteverify API.
- Secrets stay in Cloudflare project settings. They must never be committed to `.env`, `wrangler.jsonc`, or frontend variables.

Current official references:

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare D1 getting started](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare Turnstile client integration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 8. Acceptance criteria

The launch is complete when:

- `vendrome.com` and its canonical `www` behavior serve the approved coming-soon page over HTTPS.
- Only the coming-soon experience is publicly reachable; unfinished app screens are not deployed or linked.
- The page is polished and usable on mobile and desktop, with no critical accessibility or build errors.
- A real waitlist submission passes Turnstile, is stored once in D1, and returns a clear success state.
- Duplicate and invalid submissions are handled safely and clearly.
- No secret or unnecessary personal information appears in the repository, frontend bundle, or logs.
- A push to `prod` automatically rebuilds production, while pushes to other branches do not publish public previews.
- The owner knows how to review/export waitlist entries and how to roll back a Pages deployment.

## 9. Post-launch options (not required for version 1)

- Branded confirmation email or double opt-in.
- Owner notification on new signup.
- Lightweight analytics with consent-aware Cloudflare Web Analytics.
- Private waitlist dashboard with role/interest filters.
- Referral codes and launch-priority tiers.
- CRM or email-platform sync after the privacy and marketing workflow is chosen.
