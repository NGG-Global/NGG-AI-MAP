# NGG AI Assessment Platform — Architecture

This document translates `NGG_AI_Assessment_Interface_Spec.md` (the product source of truth) into a
maintainable implementation. The spec defines *what*; this document defines *how*.

## 1. Repository state at the start of the work

- The repository contained a single `README.md` and no code, tooling, database or conventions.
- The attached design package (`design/`) is the approved visual direction: Hebrew RTL first,
  light mode only, "modular / bento" tiles, Heebo typeface, NGG magenta accent. Its `tokens.css`
  is the single source of design values and is lifted into the Tailwind theme (`src/app/globals.css`).
- No conflicts exist between the repository and the specification, because the repository was empty.
  Two soft conflicts exist between the **design package** and the **specification** and are resolved
  as follows:
  - The design package asks the implementer to "ask before choosing a stack". The engineering brief
    for this work asks for an autonomous, runnable foundation. The stack below is a conservative,
    mainstream choice and is documented in `docs/DECISIONS.md` so it can be revisited.
  - The design mockups show `Clients` as the workspace entry and omit a visible `Projects` level in
    several screens. The spec's hierarchy (Client → Project) is kept in the data model and URLs; the
    UI resolves "the active project" for a client so the screens still read as in the mockups.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components, Server Actions, `proxy.ts`) | One deployable, server-side rendering and server-side authorization by default |
| Language | TypeScript, `strict: true` | Required by the brief |
| Styling | Tailwind CSS v4 with the NGG tokens as CSS variables; logical properties only | RTL at the component level, no late CSS patches |
| Database | PostgreSQL via Drizzle ORM (`pg-core`) | Multi-tenant SaaS target; typed schema, SQL migrations |
| Local / test DB | PGlite (embedded Postgres, WASM) in `.data/pglite` or in memory | Zero infrastructure for the first run; same schema and SQL as production |
| Validation | Zod | Questionnaire definitions, AI responses and form input are validated at the boundary |
| Auth | Email + password (Node `crypto.scrypt`), DB-backed sessions, `httpOnly` cookie | No third-party dependency, auditable, easy to replace with SSO later |
| Tests | Vitest (domain unit tests + DB integration tests on an in-memory PGlite) | Fast and hermetic |
| AI | `AIProvider` interface with a deterministic mock and an OpenAI-compatible HTTP provider (Groq / Cloudflare Workers AI / enterprise gateways) | Spec §30; credentials via env only |

Switching the database driver: when `DATABASE_URL` is set the app uses `pg`; otherwise it uses
PGlite under `./.data/pglite`. Tests always use an in-memory PGlite instance per test file.

## 3. Layering

```
src/
  app/            Next.js routes, layouts and server actions (thin: parse input → call service → render)
  components/     Reusable UI primitives (Tile, CapsuleBar, StatusPill, Delta, MetricCard, …)
  domain/         Pure TypeScript, no I/O: models, questionnaire logic, comparability, measurement,
                  privacy, routing, goals, authorization policy, AI contracts (Zod schemas)
  server/         I/O: db (schema, client, migrations), auth (sessions), services (authorized data
                  access), ai (providers + orchestration), audit
  lib/            i18n dictionaries, formatting, small utilities
drizzle/          Generated SQL migrations
scripts/          seed, migrate
tests/            Vitest suites (domain + db)
```

Rules:

- UI components never import from `server/`. Pages and actions call `server/services/*` only.
- `domain/` has no imports from `server/` or `app/`. The measurement engine and routing engine are
  pure functions that can be tested without a database.
- Every service takes an `Actor` (the authenticated principal) as its first argument and enforces
  authorization and tenant scope *inside* the service, not in the UI. `domain/authz` holds the policy
  (role × action × scope); `server/services/access.ts` turns a policy decision into a scoped query or a
  `ForbiddenError`.
- The AI layer only ever receives the output of the measurement engine after privacy filtering
  (`domain/ai/payload.ts`). It never sees `responses` rows.

## 4. Roles and authorization

| Role | Scope | Capabilities (summary) |
|---|---|---|
| `ngg_super_admin` | whole workspace | everything, incl. library, users, privacy settings, AI settings |
| `ngg_project_manager` | assigned clients/projects | clients, projects, questionnaires, waves, results, insights, goals, dashboard access |
| `ngg_analyst` | assigned projects, read + analysis | aggregate results, segments, insight drafts, goal drafts |
| `client_admin` | own client (optionally restricted to projects) | dashboard, waves, approved segments, goals; invite viewers if enabled |
| `client_viewer` | own client (optionally restricted to projects) | read-only dashboard and allowed filters |
| respondent | one survey token | the survey only; no account |

`Actor` = `{ userId, kind: 'ngg' | 'client', role, clientId?, projectIds? }`. Client actors are always
bound to exactly one `clientId`; every client-facing query is filtered by it. NGG project managers and
analysts see only projects listed in `project_assignments` (super admins see all).

## 5. Data model (PostgreSQL)

Hierarchy: Workspace → Client → Project → Questionnaire → Questionnaire Version → Wave → Respondent →
Response → Metric Result / Insight / Goal.

| Table | Purpose |
|---|---|
| `workspaces` | NGG tenant root (single row in V1, kept for future multi-workspace) |
| `users` | NGG and client users; `kind`, `role`, `client_id` (client users), password hash, locale |
| `sessions` | server-side sessions |
| `clients` | tenant: name, industry, size, branding, locale, `privacy_threshold` (default 7), segment taxonomy (departments, role families) |
| `projects` | engagement under a client: status, manager, `research_mode` (`research_safe` / `flexible`) |
| `project_assignments` | NGG PM/analyst access to a project |
| `client_user_project_access` | optional restriction of a client user to specific projects |
| `invitations` | dashboard-access invites (token hash, role, expiry) |
| `section_templates` | Section Library (source type, research status, audience, version, core flag) |
| `question_templates` | library questions with stable `canonical_id`, type, scale, reverse coding, metric link, lock flag |
| `metric_definitions` | configuration of metrics: items, scale, dimension group, manager/team pairing |
| `questionnaires` | per project |
| `questionnaire_versions` | immutable once locked; `definition` JSON (sections, questions, routing) validated by Zod |
| `waves` | T0/T1/…: references the frozen version, baseline wave, dates, audience, distribution, privacy mode, status |
| `respondents` | per wave; token hash, pseudonymous hash, segment attributes, progress |
| `responses` | one row per answered question; **never** read by client-facing code |
| `identity_map` | pseudonymous longitudinal mapping (email hash → respondent hash), separate from responses |
| `metric_results` | cached engine output per wave × metric × segment |
| `insights` | AI outputs: type, structured payload, evidence, input snapshot, review state |
| `goals` | goals with metric links, baseline, target direction, actions, status, source, approval |
| `audit_logs` | admin and AI actions |

All important entities have `created_at` / `updated_at`; versions and waves have `locked_at` /
`published_at` / `closed_at`.

## 6. Routes and screens

NGG workspace (`/ngg`, sidebar shell):

- `/ngg` portfolio overview (KPIs, portfolio table, attention panel)
- `/ngg/clients`, `/ngg/clients/new`, `/ngg/clients/[clientId]` (client overview + projects)
- `/ngg/clients/[clientId]/projects/[projectId]` tabs: `overview`, `assessment` (builder), `waves`,
  `waves/[waveId]` (monitoring), `results`, `insights`, `goals`
- `/ngg/clients/[clientId]/access`, `/ngg/clients/[clientId]/settings`
- `/ngg/questionnaires` (library), `/ngg/insights` (review queue), `/ngg/goals`, `/ngg/users`,
  `/ngg/settings`, `/ngg/audit`

Client workspace (`/dashboard`, capsule navigation, no sidebar):

- `/dashboard` → resolves the user's client and active project
- `/dashboard/[projectId]/{overview,adoption,management,organization,trends,goals,methodology}`

Respondent:

- `/survey/[token]` landing → `/survey/[token]/s/[sectionIndex]` → `/survey/[token]/done`

Auth: `/login`, `/invite/[token]`, `/logout` (action).

## 7. Measurement and AI boundaries

```
responses ──► domain/measurement (deterministic) ──► metric results + gaps + deltas
                                                        │
                                              domain/privacy (n < threshold → hidden)
                                                        │
                                              domain/ai/payload (sanitised, aggregated)
                                                        │
                                              server/ai/provider (mock | openai-compatible)
                                                        │
                                              Zod-validated structured insight (draft)
                                                        │
                                              NGG review ──► published ──► client dashboard
```

The measurement engine is configuration driven: `metric_definitions` + the questionnaire version
definition decide which items feed which metric, reverse coding, the minimum answered-item ratio and
the scale. Changing a rule is a data change, not a code change.
