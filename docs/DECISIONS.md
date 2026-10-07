# Product and engineering decisions (V1)

Where the specification leaves a point open (spec §49), the conservative decision below applies.
Each can be revisited without re-architecting.

| # | Question (spec §49) | V1 decision | Rationale |
|---|---|---|---|
| 1 | Is the baseline core mandatory? | **Recommended + protected.** Core sections are flagged `recommended_core`; removing one triggers a comparability warning, and under `research_safe` mode validated and core-longitudinal sections cannot be removed. | Spec §50 |
| 2 | Can a Client Admin create users? | **Only if enabled per client** (`clients.allow_client_invites`, default off). Invites are created by NGG by default. | Spec §5.4 "if configured" |
| 3 | Longitudinal tracking | **Anonymous cohort by default.** `pseudonymous` mode stores an `identity_map` row separate from responses; identified mode is not available in V1. | Spec §18 step 5, §39 |
| 4 | Privacy threshold | **n ≥ 7** per client, editable only by NGG Super Admin. Never below 5. | Spec §3.4, §50 |
| 5 | Allowed segment attributes | Department, role family, manager/employee, seniority group, location (optional). Defined per client in Client Settings. | Spec §28 |
| 6 | Freedom to change NGG measures | **Module-level on/off.** Wording changes create a *custom copy* detached from the metric. Validated items are fully locked. | Spec §3.1, §11 |
| 7 | AI insights publication | **Draft until NGG reviews.** A client never sees unreviewed AI text. | Spec §29, §55 |
| 8 | AI provider / residency | Provider is pluggable; default is the deterministic mock. Credentials and base URL come from env. | Spec §30 |
| 9 | Raw response retention | `clients.retention_days` field exists (default 730); automated purge is not implemented in V1. | Spec §39 |
| 10 | Is the client dashboard included? | Access is granted explicitly per client user (`Dashboard Access` tab); nothing is public. | Spec §33 |

Additional engineering decisions:

- **No email delivery in V1.** Invitations produce a secure link shown to the NGG user who created
  them. Hooking an email provider is a single function in `server/services/invitations.ts`.
- **Questionnaire definitions are JSON documents** on `questionnaire_versions.definition`, validated
  by Zod. A version is editable while `locked_at` is null; publishing a wave locks it. Editing a locked
  version creates the next version. This keeps the wave snapshot requirement (spec §38) trivially true.
- **Survey progress is stored per respondent**, autosaved per question. Respondents who are not
  managers never receive manager-only sections; routing is evaluated server-side from the frozen
  definition, so a respondent cannot reach hidden sections by URL.
- **Metric results are recomputed from responses on demand** and cached in `metric_results`. The cache
  is invalidated when a wave closes or when NGG requests a recompute.
- **One universal maturity score is deliberately not computed.** Metrics are presented as a profile.
- **English is supported through the same dictionary mechanism as Hebrew** (`lib/i18n`), with the
  respondent locale taken from the wave, and the user locale from the user profile.
- **Ranking question type, benchmarks, PDF export, snapshot links, SSO** are not built (spec §47–48).

Decisions made during implementation:

- **Comparability is item-based.** A metric is "fully comparable" when every baseline item that feeds it
  is present and unchanged in the follow-up questionnaire. Partial comparability is shown as a caution
  note; non-comparable metrics never receive a delta.
- **Pseudonymous mode stores only an HMAC of the email** in `identity_map`; the respondent row carries
  a random hash. Anonymous public links create a respondent per browser session (cookie scoped to the
  survey path).
- **Manager–team gaps are computed as team minus managers** so a negative number reads as "employees
  experience less than managers report" (spec §25.2 example: −0.9).
- **AI "explain change" never rewrites text.** Causal wording is flagged for the reviewer; the reviewer
  edits the paragraph before publishing.
- **Goal baselines are captured from the latest closed wave at creation time** and compared with the
  latest closed wave afterwards, so a goal created between T0 and T1 shows its delta once T1 closes.

Master Questionnaire Copy v1.0 (`docs/questionnaire/NGG_AI_Assessment_Master_Questionnaire_Copy_v1.0.md`):

- **The copy is the canonical V1 library.** Section and question IDs, Hebrew wording, scales, N/A
  options and routing come from it verbatim; every library question records `copyVersion`
  (`questionnaire-copy-he-1.0`). English for GAIL and S-TIAS is the published source wording; English
  for NGG items is a working translation that NGG has not yet approved.
- **GAIL (17 items) and S-TIAS (3 items) are locked, 1–7, and labelled as NGG Hebrew adaptations.**
  The UI never calls the Hebrew versions "validated in Hebrew". Dimension scores require every item of
  the dimension (`minAnsweredRatio: 1`).
- **"Not relevant" / "Don't know" / "Hard to assess" are stored as `na` (or as an option without a
  score) and never enter a mean.** The copy defines no "prefer not to answer", so library items do not
  offer it; client custom questions still may.
- **S-TIAS pipes the respondent's main tool** (USE_03, or the single named tool in USE_02). When no
  named product is known, the copy's fallback wording is shown.
- **Trust has no "better" direction.** `stias_trust` and `ai_nonuser_share` carry `neutralDirection`;
  their deltas are shown without good/bad colour and they are excluded from "improved" counts and from
  strongest/weakest rankings.
- **The agentic-work funnel is a share at or above "often" (≥4) per dimension** (`threshold_share`),
  not a maturity ladder. Agentic management has four dimensions and no aggregate score.
- **Manager–team gaps use only the five pairs in copy §19.** The team side is everyone who rated their
  own direct manager (including managers who have a manager); MEXP_05 has no mirror and is not paired.
- **Answers that become hidden are discarded.** If a respondent changes an earlier answer (e.g. USE_01
  to "none", or CTX_03 to "no"), stored answers to questions they can no longer see are deleted so they
  never reach scoring. A piped answer (USE_03) is discarded when its source answer no longer contains it.
- **The database library follows the deployed code.** On start-up the app compares a content hash in
  `app_meta` with the bundled library and, when it differs, upserts the library and removes rows from
  earlier editions. Existing questionnaire versions are self-contained, so drafts, locked versions and
  results are unaffected; questionnaires built from an earlier library keep their old wording until
  they are rebuilt.
- **Copy §24 (pilot checklist) is outside the software**: back-translation, expert review, cognitive
  interviews and reliability checks remain with NGG before the first external client.
- **One "next step" rule drives the NGG workspace.** `src/domain/projects/nextStep.ts` derives the single
  action that moves a project forward (project → baseline questionnaire → baseline wave → publish →
  collect → results). Every workspace screen shows the same step card, with a button when the action is
  elsewhere and a pointer when it is on the current page, so the guidance never contradicts itself.

Pilot-readiness fixes:

- **The wave calendar is applied on read.** A scheduled wave opens when its start date arrives and an
  open wave closes (and computes results) the day after its end date. The transition runs whenever
  waves are read (workspace screens, dashboards, survey links), conditional on the previous status, so
  no background job is required and concurrent requests are safe. NGG can still close a wave by hand.
- **Clients see closed waves only.** A wave that is still collecting is visible to NGG alone.
  Manager–team gaps and per-item stats are cached in `aggregate_results` when results are computed,
  so client requests never read `responses`; a closed wave computed before the cache existed is
  backfilled once by the system.
- **Password reset is an administrator-issued, one-time link** (48 hours, newest link only), because
  V1 sends no email. Super admins reset NGG accounts; project managers reset users of their clients.
  Using a link ends all of the user's sessions.
- **The creator of a client keeps access to it** (`clients.created_by_user_id`), so a project manager
  can add the first project to a client they created.
- **Rate limiting is database-backed** (`rate_limits`, fixed windows, hashed keys): login by IP and by
  email, invitation and reset links by IP, new public-link respondents by IP and wave (generous, since
  employees often share an office IP), answer saves by respondent, and AI generation by user.
- **Production refuses a missing or weak `SESSION_SECRET`** (under 32 characters or the example
  value): sign-in shows a configuration error instead of silently using a known default.
- **Open text reaches an AI provider only above max(privacy threshold, 10) answers**, after redaction of
  emails, phones, links, ID numbers, titled names and names of known users. Client and project names
  are replaced by neutral labels in every AI payload. Redaction is a safeguard, not a guarantee;
  insights remain drafts reviewed by NGG.
- **Custom matrix questions are disabled** until the builder has a rows/columns editor; a matrix with no
  rows could not be answered and blocked respondents.
