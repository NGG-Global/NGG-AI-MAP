# NGG AI Assessment Platform — Design System (Modular / Bento)

This is the approved visual direction for the NGG AI Adoption & Agentic Management platform.
It upgrades the base NGG design system (`reference/ngg-base-tokens.json`): same magenta, same
Heebo typeface, same neutrals — with a more contemporary, modular layout language.

Light mode only. Hebrew RTL is the primary language, not a translation.

All exact values live in `tokens.css`. The screens in `screens/` are the visual reference.

---

## 1. Principles

1. **One idea per tile.** Content sits in white rounded tiles on a cool grey page. A screen is
   read tile by tile, at a glance.
2. **Sentence headlines.** Each screen opens with a headline that says what is happening
   ("4 פרויקטים מחכים להחלטה"), not just a page name.
3. **One loud tile per screen.** At most one magenta tile (the key number or hero) and one ink
   tile (the next step / priority). Everything else is white or sunken grey.
4. **Numbers are the interface.** Big, heavy (800–900), tabular figures. Labels small and quiet.
5. **AI interprets, it never measures.** AI output is always visibly marked as draft or approved,
   and always shows the metrics it relied on.
6. **Privacy is visible.** Hidden segments are shown as hidden (dashed tile + lock), never silently removed.
7. **No gauges, no gamification, no colour-only meaning.**

## 2. Layout

- Page background `--color-bg-page`, page padding 16px, tile gap 16px.
- **NGG side (admin):** floating white sidebar (radius 28) + content column. Sidebar is
  `flex: 1 1 232px`, content `flex: 999 1 560px; min-width: 0`, parent `flex-wrap: wrap`
  so the sidebar stacks on small screens. Never sticky / 100vh.
- **Client dashboard:** no sidebar. Floating capsule navigation at the top, max width 1320px.
- **Mobile survey:** single column, 16px padding, sticky-feeling bottom CTA (58px pill).
- Tile rows are `display: flex; flex-wrap: wrap; gap: 16px` with different `flex` weights
  (e.g. hero `2 1 460px`, side tiles `1 1 240px`) — this creates the bento rhythm and
  collapses naturally on narrow screens.

## 3. Components

| Component | Spec |
|---|---|
| **Tile (default)** | White, radius 28, padding 24–30, no border, no shadow. |
| **Hero tile** | White, h1 40px/800, faint NGG triangle outline (6% opacity) in a corner. |
| **Accent tile** | `--color-accent` bg, white text, one giant number (64–84px/900) + delta pill `rgba(255,255,255,.2)`. |
| **Ink tile** | `--color-ink` bg, white text, accent-on-dark for labels. Used for "next step", current wave, priority. |
| **Inner row / inner tile** | `--color-surface-sunken`, radius 16–20, inside a white tile. Tables become stacks of these rows. |
| **Placeholder / planned** | Transparent, 1.5px dashed `--color-border-dashed`. |
| **Capsule bar** | White, height 52, radius 26. Breadcrumb, search, filters, actions all live in separate capsules. |
| **Nav item** | Height 44, pill. Active = ink background, white text, icon in accent-on-dark. |
| **Segmented control** | Track `--color-surface-muted`, 4px padding, pill; active segment ink. |
| **Buttons** | Primary = ink pill. Main CTA (one per screen) = accent pill. Secondary = muted pill. Heights 44 / 52 / 58. |
| **Status pill** | 28px, pill, tinted background + 6px dot + text. Never colour alone. |
| **Delta** | `↑ 0.5` green for meaningful rise, `≈ 0.1` grey for no material change. Negative numbers wrapped in `<bdi dir="ltr">−0.9</bdi>`. |

## 4. Data visualisation patterns

- **Dumbbell (T0 → T1):** scale 1–5 track; T0 = hollow grey circle, T1 = filled magenta circle,
  connector in `--color-accent-tint`. Position with `inset-inline-start: X%` where X = (score−1)/4.
- **Waffle (response rate):** 20×5 grid of 3px-radius squares; filled = ink, empty = border colour.
- **Step bars (work patterns):** four vertical rounded bars, ink → accent as the pattern gets
  more agentic. Always labelled "not a maturity ranking".
- **Manager–team gap:** two markers on one track per dimension (circle = managers, diamond = team).
- **Trend line:** time runs **right → left** (RTL). Interventions are shaded bands on the chart.
  Planned waves are dashed. Every chart has a text `<desc>` equivalent.

## 5. AI layer rules (from spec §3.3, §29, §55)

- Badge on every AI text: `טיוטת AI · ממתין לבקרה` (accent-soft) or `ניתוח AI · אושר ע״י NGG`.
- Each AI paragraph shows evidence chips: metric · score · delta · n.
- Causal claims without evidence are highlighted inline (warning colour) with a suggested rewrite.
- Automatic checks are listed explicitly (schema, metric names, PII, n ≥ 7).

## 6. RTL rules

- `<html lang="he" dir="rtl">` everywhere. Use logical properties only
  (`inset-inline-start`, `padding-inline`, `margin-inline-start`, `border-inline-start`).
- "Forward" arrows point **left**; "back" arrows point right.
- Time axes and progress bars fill right → left.
- Wrap negative numbers and mixed LTR fragments in `<bdi>`.

## 7. Accessibility

- WCAG AA contrast (muted text is `#5A5A5C`, not lighter).
- Visible focus ring: `outline: 2px solid #EC2A8C; outline-offset: 2px`.
- Every chart has a text alternative; status never relies on colour alone.
- Touch targets ≥ 44px; mobile answer options are full-width 60px rows.

## 8. Screen map

| File | Screen | Spec section |
|---|---|---|
| `screens/ngg-portfolio.html` | Portfolio overview | §7 |
| `screens/ngg-client-workspace.html` | Client workspace | §8 |
| `screens/ngg-questionnaire-builder.html` | Questionnaire builder | §9–15 |
| `screens/ngg-ai-insight-review.html` | AI insight review | §29, §55 |
| `screens/client-dashboard-overview.html` | Client dashboard — overview | §22–25 |
| `screens/client-dashboard-trends.html` | Client dashboard — trends | §27–28 |
| `screens/survey-1-landing.html` … `survey-5-complete.html` | Respondent mobile flow | §19 |

## 9. Placeholders — not final content

- All numbers, client names ("לקוח א׳…") and project-manager names are **demo data**.
- Validated scale items in the builder show `[נוסח פריט מהסולם המתוקף]` — must be replaced with
  the original validated wording, never paraphrased.
- The Likert statement in `survey-3-likert.html` is illustrative wording for an NGG measure and
  needs methodological approval.
- AI provider is `[ספק ה-AI המאושר]` (spec §49 item 8 still open).
- "השאלון פתוח עד סוף החודש", the contact link and the "על NGG" link are placeholders.
