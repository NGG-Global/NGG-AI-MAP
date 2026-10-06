# Deployment runbook

## Quick path (recommended): Vercel + Supabase, no terminal required

1. **Supabase** — create a project, open *Connect*, copy the **Transaction pooler** connection string
   (port 6543) and replace `[YOUR-PASSWORD]` with the database password you chose.
2. **Vercel** — import the GitHub repository, add the environment variables below, deploy.
3. **Setup page** — open `https://<your-site>/setup`, enter the `SETUP_TOKEN` value, your name,
   email and a password. This creates the Super Admin and loads the libraries.
4. **Remove `SETUP_TOKEN`** from Vercel and redeploy. The page is disabled once a user exists anyway.
5. **AI (optional)** — set `AI_PROVIDER=openai_compatible`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
   and redeploy.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction-pooler string |
| `DATABASE_SSL` | `encrypt` (default; set `verify` only if you install the provider CA) |
| `SESSION_SECRET` | long random string (`openssl rand -hex 32` or any password generator, 48+ characters) |
| `APP_URL` | the site's public URL, no trailing slash |
| `SETUP_TOKEN` | long random string, used once on `/setup`, then removed |
| `AI_PROVIDER` | `mock` until an AI key is configured |

Supabase exposes the `public` schema through its Data API by default. Migration `0002` enables
row-level security and revokes `anon`/`authenticated` access on every table, so the API returns
nothing. Verify after deploy: Supabase → Advisors → Security Advisor should report no
"RLS disabled in public" findings. Optionally also turn the Data API off entirely
(Project Settings → Data API), since this platform never uses it.

The detailed runbook below covers the same steps plus self-hosting and terminal alternatives.


Manual steps to take the platform from this repository to a working production environment.
Steps are ordered; each one states what it produces. Where a value must be confirmed against a
provider's current documentation, the step says so.

## 0. What you need before starting

| Item | Why |
|---|---|
| A GitHub repository with this code on the branch you deploy from | the host pulls from it |
| A managed PostgreSQL database (Neon, Supabase, Railway, AWS RDS, Azure Database for PostgreSQL, …) | PGlite is for local development only |
| A Node.js host that can run a Next.js server (Vercel, Railway, Render, Fly.io, or your own Node 20.9+ server) | the app is a server, not static files |
| A domain name and the ability to set DNS records | HTTPS and session cookies |
| Optionally, an API key for an OpenAI-compatible model endpoint (Groq, Cloudflare Workers AI, an enterprise gateway) | AI insights; without it the deterministic mock provider is used |

## 1. Create the production database

1. Create a PostgreSQL 14+ database at your provider.
2. Copy the connection string. It must look like `postgresql://USER:PASSWORD@HOST:5432/DBNAME`.
   Most managed providers require TLS; keep their `?sslmode=require` suffix in the string.
3. Keep this string private. It is the `DATABASE_URL` secret in step 3.

Result: an empty database the application can reach.

## 2. Generate the secrets

1. Session secret, at least 32 random bytes:
   ```bash
   openssl rand -hex 32
   ```
   This becomes `SESSION_SECRET`. It also keys the pseudonymous identity hashes, so changing it later
   breaks longitudinal linking for pseudonymous waves. Store it in a password manager.
2. Decide the public URL, for example `https://assess.nggconsult.com`. This becomes `APP_URL` and is
   embedded in every survey and invitation link.

## 3. Configure environment variables on the host

Set these in the host's environment settings (Vercel → Project → Settings → Environment Variables;
Railway/Render → Variables; on a server, in the service's environment file). Never commit them.

| Variable | Value |
|---|---|
| `DATABASE_URL` | connection string from step 1 |
| `SESSION_SECRET` | secret from step 2 |
| `APP_URL` | public URL from step 2, no trailing slash |
| `NODE_ENV` | `production` (most hosts set this automatically) |
| `AI_PROVIDER` | `mock` for now; see step 8 to switch |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | leave empty until step 8 |

Do not set `SEED_PASSWORD` in production; the seed must never run there (it wipes the database).

## 4. Deploy the application

### Option A — Vercel (fastest)

1. Import the GitHub repository in Vercel. Framework preset: Next.js. Root directory: repository root.
2. Build command `npm run build`, install command `npm install`, output: default.
3. Confirm Node.js 20.x or 22.x in Project → Settings → General.
4. Deploy. The first deploy fails at runtime (not at build) if `DATABASE_URL` is missing, so set the
   variables from step 3 before the first deploy.

### Option B — Your own Node server or container platform

1. Install Node.js 22 LTS (Node 20.9 is the minimum).
2. On the server: `git clone … && npm ci && npm run build`.
3. Start with `npm start` (listens on port 3000; set `PORT` to change). Run it under a process
   manager (systemd, pm2) so it restarts on failure.
4. Put a reverse proxy with HTTPS in front (Nginx, Caddy, the platform's load balancer). Forward
   `Host` and `X-Forwarded-Proto` headers so secure cookies work.

Result: the login page is reachable at `APP_URL/login`.

## 5. Apply database migrations

The application applies pending migrations from `drizzle/` automatically on its first database
access, so after a successful deploy the schema exists. To apply them explicitly (recommended before
the first start, and after every release that changes `drizzle/`):

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

Run this from a machine that can reach the database (your laptop, a CI job, or the host's console).

Result: all tables and enums exist; the database is still empty.

## 6. Create the first NGG Super Admin

Easiest: set `SETUP_TOKEN`, open `/setup` in the browser, fill the form (this also loads the
libraries, so step 7 can be skipped), then remove `SETUP_TOKEN`.

Terminal alternative, without seeding:

```bash
DATABASE_URL="postgresql://…" npm run admin:create -- --email you@nggconsult.com --name "Your Name" --password "a-long-unique-password"
```

The script creates the workspace if needed and only this user; it does not load libraries (next step).
Sign in at `APP_URL/login` with this account to confirm authentication works.

## 7. Load the questionnaire and measurement libraries

The Section Library, Question Library and Metric Library are data, not code. Load them once:

```bash
DATABASE_URL="postgresql://…" npm run library:load
```

The script is idempotent and never touches client data. Re-run it after any change to `src/domain/questionnaire/libraryContent.ts`.

Then, as Super Admin, open `/ngg/questionnaires` and `/ngg/measurements` to confirm the modules
and metrics are listed.

**Required before any live wave:** the validated-scale items (`gen_ai_literacy`, `trust_in_ai`) are
seeded with placeholder wording. NGG's methodology lead must replace the placeholder text in
`libraryContent.ts` with the original wording from the licensed source scales, then re-run this step.
The builder shows a warning until this is done.

## 8. Connect an AI provider (optional, can be done later)

With `AI_PROVIDER=mock` the platform generates deterministic, number-only insights. To use a model:

1. Obtain an API key from the provider and the base URL of its OpenAI-compatible chat-completions
   API. Examples to confirm in the provider's current documentation: Groq uses
   `https://api.groq.com/openai/v1`; Cloudflare Workers AI exposes an OpenAI-compatible endpoint
   under your account id. The endpoint must support `response_format: { type: "json_object" }`.
2. Set `AI_PROVIDER=openai_compatible`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` on the host and
   redeploy (or restart).
3. Verify in `/ngg/settings` that the provider and model are shown, then generate a test insight on a
   closed wave and check it appears in the review queue as a draft.
4. Data residency: the provider receives only aggregated metrics, gaps, barrier shares and redacted
   open-text samples. Confirm this is acceptable under the client contract before enabling open-text
   theme analysis.

## 9. Set up NGG staff accounts

As Super Admin, open `/ngg/users` and create project managers and analysts. Give each person their
initial password through a secure channel; there is no email delivery in this version.

## 10. Onboard the first client

1. `/ngg/clients/new` — create the client (name, short identifier, industry, size, language).
2. Client → Settings — enter departments, role families, seniority groups and locations. These
   become the survey's background questions and the dashboard filters, so agree them with the client
   before launching. Confirm the anonymity threshold (default 7; Super Admin only).
3. Client → create a project, assign the project manager, keep research mode "Research-safe".
4. Project → Assessment → "Create Baseline Assessment", review sections, add client questions,
   preview as employee and manager.
5. Project → Waves → "Baseline wave": dates, audience, distribution (public link or unique links),
   privacy mode, number invited. Publish.
6. Distribute: copy the survey link (public) or generate and download the CSV of unique links and
   send them through the client's own channels.
7. Monitor response rate on the wave page. Close the wave when collection ends; results compute
   automatically.
8. Results → review; Insights → generate an executive summary, edit, mark reviewed, publish.
9. Goals → create or adopt AI suggestions, approve, mark "Show on client dashboard".
10. Dashboard Access → invite the client admin and viewers. Copy each invitation link and send it
    securely; links expire after 14 days.

## 11. Operations

- **Backups:** enable your provider's automated backups and point-in-time recovery. The `responses`
  table is the only non-reconstructible data.
- **Releases:** merge to the deployment branch; the host rebuilds. If `drizzle/` changed, run
  step 5 against production first (or rely on the automatic migration on first request).
- **Rotating `SESSION_SECRET`:** signs everyone out and invalidates pseudonymous identity mappings;
  rotate only between projects.
- **Audit log:** `/ngg/audit` (Super Admin) records admin and AI actions.
- **Retention:** `clients.retention_days` is stored but not enforced automatically yet; purge raw
  responses with a scheduled job when a retention policy is agreed.

## 12. Not included in this version (plan for them)

- Email delivery for invitations and survey distribution.
- Executive snapshot links, PDF export, SSO/SAML, HRIS sync, cross-client benchmarks.
- Scheduled reminders and follow-up notifications.
