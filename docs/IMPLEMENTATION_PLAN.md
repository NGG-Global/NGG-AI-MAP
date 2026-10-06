# Implementation plan

Each phase leaves the application runnable (`npm run dev`) with seed data. Status is updated as
phases land.

## Phase 1 — Foundation
- [x] Next.js 16 + TypeScript strict + Tailwind v4 with NGG design tokens (RTL-first layout)
- [x] Drizzle schema for the full hierarchy, SQL migrations, PGlite/Postgres driver switch
- [x] Email/password authentication with server-side sessions
- [x] `Actor` model and policy-based authorization enforced in services; tenant isolation
- [x] NGG shell (sidebar, breadcrumb, top bar) and client shell (capsule navigation)
- [x] Clients list / new / overview, Projects, project assignments
- [x] Dashboard Access (invite link, role, project restriction, revoke)
- [x] Client Settings (segment taxonomy, privacy threshold, branding, locale)
- [x] Seed: NGG users, three clients, projects, library, waves with responses
- [x] Tests: tenant isolation, role permissions

## Phase 2 — Questionnaire system
- [x] Section Library + Question Library with source type and research status badges
- [x] Questionnaire definition schema (Zod) and versioning (draft → locked → next version)
- [x] Builder: add/remove/reorder sections, audience, display logic (field → operator → value)
- [x] Custom questions; locked validated items with "create custom copy"
- [x] Summary panel: questions, employee/manager counts, time, validated/custom items, comparability
- [x] Preview by persona
- [x] Tests: locked validated questions, versioning, custom copy detachment

## Phase 3 — Waves
- [x] Create baseline / follow-up wave (duplicate previous questionnaire by default)
- [x] Snapshot freezing on publish; close wave
- [x] Comparability calculation and diff (added / removed / modified / metrics affected)
- [x] Audience, dates, distribution mode, privacy mode
- [x] Response monitoring (invited / started / completed / rate / per day)
- [x] Tests: snapshots, comparability

## Phase 4 — Respondent survey
- [x] Landing, section intro, question screens, completion; mobile-first RTL with LTR support
- [x] Autosave per answer, resume, progress indicator
- [x] Server-side routing (employee / manager / non-AI-user), "prefer not to answer"
- [x] Anonymous and pseudonymous respondents; client branding
- [x] Tests: routing

## Phase 5 — Measurement engine
- [x] Config-driven scoring: reverse coding, missing handling, normalisation, segments
- [x] Wave comparison, deltas, comparability-aware metrics
- [x] Manager–team gaps, response counts, privacy suppression
- [x] Tests: calculations and suppression

## Phase 6 — Dashboards, AI, goals
- [x] NGG portfolio dashboard and attention panel
- [x] NGG client workspace: results, insights, goals
- [x] Client executive dashboard: overview, adoption, management, organization, trends, goals, methodology
- [x] `AIProvider` (mock + OpenAI-compatible), structured outputs validated with Zod, evidence references
- [x] Insight workflow: draft → reviewed → published; never auto-published
- [x] Goals: entity with metric links, baseline, target direction, status flow, AI/human source, approval
- [x] Type check, lint, tests and production build green

Items are ticked only once implemented and verified in this repository.
