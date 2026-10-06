# NGG AI Adoption & Agentic Management Platform

Multi-tenant SaaS for running organisational AI-adoption diagnostics: NGG consultants configure
questionnaires, launch measurement waves, analyse results and share executive dashboards with client
leadership. The product specification lives in `docs/NGG_AI_Assessment_Interface_Spec.md`; the
technical architecture in `docs/ARCHITECTURE.md`; open product decisions in `docs/DECISIONS.md`.

## Quick start

```bash
npm install
cp .env.example .env        # optional: defaults work for local development
npm run db:seed             # creates ./.data/pglite (embedded PostgreSQL) and loads demo data
npm run dev                 # http://localhost:3000
```

Demo accounts (password: the value of `SEED_PASSWORD`, default `ngg-demo-2026`):

| Email | Role |
|---|---|
| `admin@ngg.demo` | NGG Super Admin |
| `noa@ngg.demo`, `yoav@ngg.demo`, `michal@ngg.demo` | NGG Project Managers |
| `analyst@ngg.demo` | NGG Analyst |
| `ceo@gamma.demo` | Client Admin (גמא תעשיות) |
| `hr@alpha.demo` | Client Viewer (אלפא פיננסים, English UI) |

All demo organisations, people and numbers are fictional.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run db:migrate` | apply SQL migrations (`drizzle/`) to the configured database |
| `npm run db:seed` | reset and seed demo data (local PGlite or `DATABASE_URL`) |
| `npm run db:generate` | generate a migration after editing `src/server/db/schema.ts` |
| `npm run db:reset` | delete the local PGlite data directory |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (domain + database integration tests on in-memory PGlite) |
| `npm run build` | production build |
| `npm run check` | all of the above |

## What the demo contains

- **גמא תעשיות** — two closed waves (T0 January 2026, T1 September 2026), published executive
  summaries and open-text themes, one draft "explain change" insight in the review queue, three active
  management goals shown on the client dashboard and one AI-suggested goal awaiting approval.
- **אלפא פיננסים** — a baseline wave currently collecting (low response rate shows in the attention panel).
- **בטא בריאות** — a questionnaire in draft, no wave yet.

Validated-scale items are seeded with placeholder wording (marked in the builder) because the original
wording must be inserted from the licensed source by NGG's methodology lead. NGG measure wording is
illustrative pending methodological approval.

## AI provider

`AI_PROVIDER=mock` (default) uses a deterministic provider that only restates numbers from the
aggregated payload. Set `AI_PROVIDER=openai_compatible` with `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`
to call any OpenAI-compatible chat-completions endpoint (Groq, Cloudflare Workers AI, gateways).
All calls go through `src/server/ai`; outputs are validated against Zod schemas, unknown metric ids are
rejected, causal language is flagged, and every insight starts as a draft for NGG review.

## Database

By default the app runs on PGlite, an embedded PostgreSQL, stored in `./.data/pglite`. Set
`DATABASE_URL` to a PostgreSQL connection string for staging or production; the same migrations apply.
Only one process may open the PGlite directory at a time, so stop `npm run dev` before running
`npm run db:seed`.

## Structure

See `docs/ARCHITECTURE.md` §3. In short: `src/domain` is pure business logic (questionnaires,
measurement, privacy, authorization policy, AI contracts), `src/server` does I/O and enforces
authorization inside every service, `src/app` holds thin Next.js routes, `src/components` the
reusable UI primitives, and `design/` the approved visual reference.
