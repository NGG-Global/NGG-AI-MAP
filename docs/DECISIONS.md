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
