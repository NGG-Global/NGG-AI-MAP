# NGG AI Adoption & Agentic Management Platform
## מסמך אפיון מוצר וממשק — V1.0

**סטטוס:** Product Specification  
**קהל יעד:** צוות מוצר, UX/UI, פיתוח, Data/Analytics, יועצים ומנהלי פרויקטים ב-NGG  
**מטרת המסמך:** להגדיר מערכת רב-לקוחית (multi-tenant) לניהול אבחוני AI ארגוניים, התאמת שאלונים, איסוף נתונים, ניתוח longitudinal, הפקת תובנות מבוססות AI ושיתוף דשבורדים עם הנהלות לקוח.

---

# 1. תקציר מנהלים

המערכת נועדה להפוך את אבחון השימוש ב-AI בארגון מתהליך חד-פעמי של סקר ודוח, למוצר מתמשך שמחבר בין **אבחון, פרשנות, הצבת מטרות, התערבות ומדידת שינוי לאורך זמן**.

המערכת תשרת שני צדדים עיקריים:

1. **הצד של NGG** — מנהלי מערכת, מנהלי פרויקטים ויועצים שיוצרים לקוחות, מתאימים עבורם שאלונים, משיקים גלי מדידה, מנתחים תוצאות ומגדירים יעדים.
2. **הצד של הלקוח** — הנהלה ובעלי תפקידים מורשים שמקבלים דשבורד אישי לארגון, עוקבים אחרי תוצאות, מגמות, פערים ומטרות לאורך זמן.

עקרון המוצר המרכזי:

> **Measure → Understand → Act → Measure Again**

המערכת אינה רק Survey Builder ואינה רק BI Dashboard. היא צריכה להיות **AI Adoption & Management Diagnostic Platform** שבה השאלון, הנתונים, התובנות, היעדים והמעקב הם חלק מאותו workflow.

---

# 2. מטרות המוצר

## 2.1 מטרות עסקיות

- ליצור נכס IP חוזר עבור NGG בתחום הטמעת AI ופיתוח מנהלים.
- לאפשר התאמה מהירה של אבחון עבור לקוחות שונים בלי לבנות סקר חדש בכל פרויקט.
- לייצר שירות מתמשך ולא רק אבחון חד-פעמי.
- לאפשר ל-NGG להראות impact של תהליך הטמעה באמצעות מדידות T0, T1, T2 וכו'.
- לאפשר השוואה בין לקוחות בעתיד באמצעות benchmarks אנונימיים, בכפוף להסכמות ורגולציה.
- לחבר בין אבחון לבין הצעות לפעולה, סדנאות, coaching ותוכניות הטמעה.

## 2.2 מטרות משתמש

### מנהל פרויקט NGG

- להקים לקוח חדש במהירות.
- להרכיב שאלון מתוך ספריית מודולים מוכנה.
- להבין מה חובה להשאיר כדי לשמר יכולת השוואה לאורך זמן.
- להוסיף שאלות מותאמות ללקוח.
- לשלוח שאלון ממותג.
- לעקוב אחרי שיעור המענה.
- לנתח תוצאות ולהפיק תובנות.
- לשתף דשבורד עם הנהלת הלקוח.
- להקים Wave נוסף ולהשוות ל-baseline.

### הנהלת הלקוח

- לראות תמונת מצב ברורה ולא טבלת תשובות.
- להבין מה השתנה מאז המדידה הקודמת.
- להבין היכן נמצאים חסמים והזדמנויות.
- לראות פערי מנהל–צוות.
- לעקוב אחרי מטרות ניהוליות וארגוניות.
- לקבל המלצות מבוססות נתונים.

### משיב השאלון

- להבין למה נשאל כל מידע.
- להשלים את השאלון בקלות, גם במובייל.
- להרגיש שהתשובות אינן משמשות להערכת ביצועים אישית.
- לקבל חוויה קצרה, ברורה ומותאמת לתפקיד.

---

# 3. עקרונות מוצר מנחים

## 3.1 מודולריות ללא פגיעה במדידה

כל שאלון נבנה ממודולים. מנהל הפרויקט יכול לבחור אילו מודולים יופיעו, אבל המערכת מבדילה בין שלושה סוגי פריטים:

### A. Validated / Source Scale
פריטים שנלקחו מסולם מחקרי קיים. ניסוח, סדר, סקאלה ולוגיקת scoring שלהם נעולים כברירת מחדל.

### B. NGG Research-Informed Measure
פריטים שפותחו על ידי NGG על בסיס המסגרת המחקרית. ניתן להפעיל/לכבות ברמת מודול, אך שינוי ניסוח צריך ליצור version חדש.

### C. Client Custom Question
שאלות מותאמות לפרויקט או לקוח. אינן נכנסות אוטומטית למדדי הליבה ואינן מוצגות כמדדים מתוקפים.

## 3.2 longitudinal first

כל רכיב במערכת צריך להניח מראש שתהיה מדידה נוספת בעתיד. לכן:

- כל שאלה מקבלת `question_id` קבוע.
- כל מודול מקבל version.
- כל Wave שומר snapshot של השאלון שנשלח בפועל.
- המערכת מתריעה לפני הסרת פריט שהיה חלק מ-baseline.
- השוואת T0/T1 מתבצעת רק על פריטים ומדדים ברי השוואה.

## 3.3 AI מפרש, לא מודד

הציונים, הממוצעים, הדלתאות, פילוחים ומדדי confidence מחושבים על ידי מנוע אנליטי דטרמיניסטי.

ה-AI מקבל **נתונים מחושבים ומאוגדים**, ומבצע:

- ניסוח Executive Summary.
- זיהוי דפוסים.
- הסבר שינויים.
- הצעת שאלות המשך.
- הצעת מטרות ניהוליות.
- ניתוח תשובות פתוחות.

ה-AI לא משנה ציונים ולא ממציא נתונים חסרים.

## 3.4 Privacy by design

- דשבורד לקוח מציג מידע מצרפי בלבד כברירת מחדל.
- אין חשיפת תשובה אישית להנהלה.
- פילוחים קטנים מוסתרים מתחת ל-threshold מוגדר, ברירת מחדל `n < 7`.
- longitudinal אישי, אם נדרש, נשמר pseudonymously.
- הרשאות הן ברמת tenant, client, project ו-role.

## 3.5 Actionable over impressive

כל insight בדשבורד צריך לענות לפחות על אחת משלוש שאלות:

1. מה קורה?
2. למה זה חשוב?
3. מה כדאי לעשות עכשיו?

---

# 4. היררכיית המערכת

```text
NGG Workspace
│
├── Clients
│   ├── Client A
│   │   ├── Projects
│   │   │   └── AI Adoption 2026
│   │   │       ├── Questionnaire Template
│   │   │       ├── Wave T0
│   │   │       ├── Wave T1
│   │   │       ├── Wave T2
│   │   │       ├── Goals
│   │   │       └── Client Dashboard
│   │   └── Users / Access
│   │
│   └── Client B
│
├── Questionnaire Library
├── Measurement Library
├── Benchmark Library [Future]
├── AI Insight Engine
└── NGG Admin & Analytics
```

### ישויות ליבה

- Workspace
- Client
- Project
- User
- Role
- Questionnaire Template
- Questionnaire Version
- Section / Module
- Question
- Scale / Metric
- Wave
- Response
- Respondent Token
- Segment
- Insight
- Goal
- Intervention
- Dashboard Access
- Audit Log

---

# 5. סוגי משתמשים והרשאות

## 5.1 NGG Super Admin

גישה לכל המערכת.

יכול:

- ליצור ולמחוק לקוחות.
- לנהל משתמשי NGG.
- לנהל ספריית שאלונים וסולמות.
- להגדיר אילו מודולים הם locked.
- להגדיר scoring rules.
- לנהל AI provider והגדרות מערכת.
- לצפות בכל הלקוחות והפרויקטים.
- לנהל הגדרות privacy ו-threshold.

## 5.2 NGG Project Manager

גישה ללקוחות/פרויקטים שהוקצו אליו.

יכול:

- ליצור פרויקט.
- לבנות שאלון.
- לבחור מודולים.
- להוסיף שאלות מותאמות.
- ליצור Wave.
- להפעיל/לסגור שאלון.
- לצפות בתוצאות.
- ליצור תובנות AI.
- להגדיר מטרות.
- להזמין משתמשי לקוח לדשבורד.

לא יכול:

- לשנות נוסח canonical של Scale גלובלי.
- לצפות בפרויקטים שלא הוקצו אליו.
- לשנות מדיניות privacy מערכתית ללא הרשאה.

## 5.3 NGG Analyst / Consultant

גישה לקריאה וניתוח בפרויקטים שהוגדרו.

יכול:

- לצפות בנתונים aggregate.
- לבצע פילוחים.
- ליצור insight drafts.
- לכתוב המלצות.

ללא הרשאת client management כברירת מחדל.

## 5.4 Client Admin

משתמש מטעם הלקוח.

יכול:

- לצפות בדשבורד הארגון.
- לצפות בגלי מדידה.
- להשתמש בפילוחים מאושרים.
- לצפות במטרות והמלצות.
- להזמין Client Viewers אם הוגדר לכך.

אינו יכול:

- לראות raw individual responses.
- לשנות scoring.
- לערוך שאלות לאחר השקה.

## 5.5 Client Viewer / Executive

Read-only.

מיועד להנהלה בכירה, HR, L&D, CIO וכדומה.

יכול:

- לצפות בדשבורד.
- לשנות filters מותרים.
- להוריד Executive Summary אם הוגדר.

## 5.6 Respondent

לא נדרש חשבון מערכת.

מקבל:

- לינק ייחודי או לינק ציבורי מוגן.
- שאלון מותאם לפי routing.
- ללא גישה לדשבורד.

---

# 6. מבנה הניווט — NGG Admin

Sidebar מוצע:

```text
Overview
Clients
Projects
Questionnaires
Measurements
AI Insights
Goals & Follow-up
Users
Settings
```

### Top Bar

- Search
- Current workspace
- Notifications
- User menu

### Context switcher

כאשר נכנסים ללקוח:

`NGG / Client Name / Project Name`

כדי למנוע בלבול בין לקוחות.

---

# 7. מסך Overview ארגוני — NGG

מטרתו לתת תמונת מצב על כל פעילות הלקוחות.

## 7.1 KPI cards

- Active Clients
- Active Surveys
- Responses This Month
- Follow-up Waves Due
- Open Management Goals
- Projects Requiring Attention

## 7.2 Client Portfolio Table

עמודות:

- Client logo/name
- Project
- Project Manager
- Current Wave
- Survey status
- Response rate
- Last activity
- Next follow-up
- Client dashboard access status

Quick actions:

- Open client
- Edit questionnaire
- View responses
- Generate insight
- Create follow-up wave
- Manage access

## 7.3 Attention panel

דוגמאות:

- "Client A — response rate is below 40%"
- "Client B — T1 recommended this month"
- "Client C — 3 new client users awaiting access"
- "Client D — AI insight not yet reviewed"

## 7.4 Portfolio visualization [V2]

השוואה אנונימית/פנימית בין לקוחות לפי maturity, בתנאי שיש הרשאה להשתמש בנתונים aggregated.

---

# 8. Client Workspace — צד NGG

כל לקוח מקבל סביבת עבודה עצמאית.

Tabs:

1. Overview
2. Assessment
3. Waves
4. Results
5. Goals
6. Dashboard Access
7. Client Settings

## 8.1 Client Overview

Hero:

- Client logo
- Client name
- Industry
- Project Manager
- Project status

Cards:

- Current Wave
- Responses
- Response Rate
- Last Measurement
- Next Measurement

Insights preview:

- Biggest Strength
- Biggest Gap
- Biggest Change
- Current Management Priority

Timeline:

```text
T0 Baseline → Workshop → Goal cycle → T1 → Follow-up → T2
```

---

# 9. Questionnaire Builder

זהו אחד המסכים המרכזיים במוצר.

## 9.1 מבנה המסך

Desktop layout בשלושה אזורים:

### Left panel — Section Library

רשימת מודולים זמינים.

### Center — Questionnaire Canvas

השאלון הנוכחי, לפי סדר.

### Right panel — Configuration

הגדרות של section/question שנבחר.

---

# 10. Section Library

הספרייה מכילה מודולים מוכנים כגון:

### Core Context
- Organizational Context
- Role & Seniority

### AI Adoption
- AI Usage
- Use Case Breadth
- Tool Access

### Validated Measures
- Generative AI Literacy
- Trust in AI

### NGG Measures
- Agentic Work
- Verification Behavior
- Organizational AI Enablement
- Manager Experience
- Agentic Management
- Human–AI Delegation Map

### Outcomes
- Impact & Productivity
- Barriers
- Opportunities

### Qualitative
- Open Questions

### Custom
- Client Questions

כל מודול מציג:

- שם
- תיאור קצר
- Audience
- מספר שאלות
- זמן משוער
- Research status
- Mandatory/Optional
- Longitudinal compatibility

Badge examples:

- `Validated`
- `NGG Measure`
- `Experimental`
- `Client Custom`
- `Manager Only`
- `Recommended Core`

---

# 11. פעולות Questionnaire Builder

מנהל הפרויקט יכול:

- Add section
- Remove section
- Reorder sections
- Preview section
- Duplicate custom section
- Add custom question
- Configure routing
- Configure required/optional
- Add intro text
- Add client-specific explanation
- Change visual label of a section

### Scale protection

אם מודול כולל שאלות מסולם מחקרי:

- טקסט השאלה נעול.
- סקאלת התשובה נעולה.
- scoring נעול.
- ניתן לכבות את המודול כולו אם הפרויקט מאפשר.

בעת ניסיון לשנות פריט נעול:

> "This item is part of a standardized measure. Editing it may invalidate comparison and scoring. Create a custom copy instead."

אפשרות:

`Create custom copy`

העותק אינו משויך יותר לסולם המתוקף.

---

# 12. Research Safety Mode

Toggle ברמת הפרויקט:

## Research-safe

ברירת המחדל המומלצת.

- core longitudinal questions נעולים.
- validated scales נעולים.
- המערכת מזהירה מפגיעה ב-comparability.
- scoring אוטומטי מלא.

## Flexible

לפרויקטים מיוחדים.

- ניתן להסיר חלק מה-core.
- המערכת מציגה warning ברור.
- metrics מסוימים מסומנים כ-unavailable.

---

# 13. Question Types

המערכת צריכה לתמוך ב:

- Single choice
- Multi-select
- Likert 1–5
- Likert 1–7
- Matrix
- Numeric
- Short text
- Long text
- Ranking [V2]

לכל שאלה:

- `question_id`
- Label
- Help text
- Audience
- Required
- Response scale
- Metric association
- Source
- Version
- Display logic

---

# 14. Routing & Conditional Logic

המערכת צריכה לתמוך ב-routing ללא קוד.

דוגמאות:

```text
IF managerial_responsibility = yes
SHOW Agentic Management
```

```text
IF AI_use_last_30_days = none
SKIP Trust + Verification Experience
```

```text
IF department = Technology
SHOW client_custom_tech_section
```

UI:

`Show this section when...`

Builder ויזואלי פשוט:

Field → Operator → Value.

---

# 15. Questionnaire Summary Panel

תמיד מוצג בחלק העליון של Builder:

- Estimated completion time
- Total questions
- Questions for employees
- Questions for managers
- Validated items
- Custom items
- Longitudinal coverage

### Comparability indicator

לדוגמה:

`Wave comparability: 94%`

אם מנהל הפרויקט הסיר שאלות baseline:

> "2 longitudinal metrics will no longer be fully comparable with T0."

---

# 16. Preview Mode

אפשרות preview לפי persona:

- Employee
- Manager
- Non-AI user
- Specific Department

Preview חייב לעבוד במובייל ובדסקטופ.

אפשרות:

`Send preview link`

ללקוח לפני השקה.

---

# 17. Approval Workflow [Recommended]

Questionnaire states:

```text
Draft → Internal Review → Client Review → Approved → Published → Closed
```

מנהל הפרויקט יכול לשתף Client Review Link שבו הלקוח:

- רואה את השאלון.
- משאיר comments.
- לא יכול לשנות שאלות ישירות.

V1 אפשר להסתפק ב-preview + approval button.

---

# 18. Wave Management

Wave הוא מופע מדידה בזמן.

לדוגמה:

- T0 — Baseline
- T1 — 3 months
- T2 — 6 months

## Create Wave Flow

### Step 1 — Wave basics

- Name
- Internal code
- Start date
- End date
- Baseline / Follow-up

### Step 2 — Questionnaire

- Use existing template
- Duplicate previous wave
- Create from library

ברירת המחדל ל-follow-up:

`Duplicate T0 questionnaire and preserve comparable items.`

### Step 3 — Audience

- All organization
- Selected units
- Managers only
- Employee sample

### Step 4 — Distribution

- Anonymous public link
- Unique token links
- CSV invite list
- Email integration [Future]

### Step 5 — Privacy

- Anonymous
- Pseudonymous longitudinal
- Identified [disabled by default / requires elevated approval]

### Step 6 — Launch

Summary + warnings.

---

# 19. Survey Distribution & Respondent Experience

## 19.1 Survey Landing

כולל:

- Client logo
- NGG attribution
- Survey name
- Estimated time
- Privacy explanation
- Contact/help
- CTA: Start

## 19.2 Survey UX

- One section at a time.
- Progress bar.
- Autosave.
- Responsive RTL/LTR.
- Accessible keyboard navigation.
- Minimal visual noise.
- Optional "Prefer not to answer" where appropriate.

## 19.3 Completion Screen

- תודה.
- הסבר קצר על השלב הבא.
- אין הצגת ציון אישי כברירת מחדל.

Future:

- Personal learning profile opt-in.

---

# 20. Response Monitoring

בצד NGG בלבד.

Cards:

- Invited
- Started
- Completed
- Completion Rate
- Median Completion Time

Charts:

- Responses per day
- Completion by segment

No raw response table for client users.

NGG privileged users יכולים לגשת ל-raw dataset רק לפי policy.

---

# 21. Measurement Engine

המנוע האנליטי הוא שכבה נפרדת מה-LLM.

אחראי על:

- Scale scoring
- Reverse coding
- Missing item handling
- Score normalization
- Segment aggregation
- Wave comparison
- Delta calculation
- Manager–Team gap
- Threshold suppression
- Statistical confidence [V1.5/V2]

## Metric object

```json
{
  "metric_id": "agentic_manage_systems",
  "name": "Manage Human-AI Systems",
  "score": 3.42,
  "scale_min": 1,
  "scale_max": 5,
  "n": 86,
  "wave": "T1",
  "baseline_score": 2.91,
  "delta": 0.51,
  "comparable": true
}
```

---

# 22. Client Dashboard — עקרונות

הדשבורד של הלקוח הוא מוצר בפני עצמו, לא העתק מצומצם של ממשק NGG.

מטרתו:

> "Help leadership understand where the organization is, what changed, and what to do next."

Navigation:

```text
Overview
AI Adoption
Management
Organization
Trends
Goals
Methodology
```

אין sections של Builder, raw responses או system configuration.

---

# 23. Client Dashboard — Overview

## 23.1 Header

- Client logo
- Assessment name
- Current wave
- Comparison selector: `T1 vs T0`
- Last updated

## 23.2 Executive Summary

AI-generated, human-reviewed text.

מבנה:

### Current State
משפט אחד.

### Biggest Change
משפט אחד.

### Primary Risk
משפט אחד.

### Recommended Priority
משפט אחד.

Badge:

`AI-generated analysis • Reviewed by NGG`

או אם לא עבר review:

`Draft insight — NGG review pending`

## 23.3 Core KPI cards

- AI Usage
- AI Literacy
- Agentic Work
- Verification
- Organizational Enablement
- Agentic Management [if applicable]

כל card מציג:

```text
3.8 / 5
↑ 0.4 from baseline
```

לא להשתמש בצבע בלבד לסימון משמעות.

## 23.4 Key Findings

3–5 cards:

- Strength
- Gap
- Change
- Risk
- Opportunity

---

# 24. AI Adoption View

Sections:

## Usage frequency

- Daily use %
- Non-user %
- Change over waves

## Use-case breadth

Horizontal bar chart לפי סוגי משימות.

## Agentic Work Funnel

```text
Assist        84%
Collaborate   61%
Delegate      29%
Orchestrate   11%
```

לא להציג את זה כ-maturity stage קשיח עד שיש validation.

## AI Literacy dimensions

Radar או horizontal grouped bars:

- Basic Operation
- Prompting
- Evaluation
- Innovative Application
- Ethics & Compliance

---

# 25. Management View

מוצג כאשר קיימים משיבים מנהלים.

## 25.1 Agentic Management Profile

ארבעה dimensions:

- Manage Self
- Manage Humans
- Manage AI
- Manage Human–AI Systems

עדיפות ל-horizontal bar ולא radar כברירת מחדל.

## 25.2 Manager–Team Gap

השוואה בין דיווחי מנהלים לחוויית עובדים.

דוגמה:

| Dimension | Managers | Team | Gap |
|---|---:|---:|---:|
| AI clarity | 4.4 | 3.5 | -0.9 |
| Experimentation | 4.0 | 3.6 | -0.4 |
| Verification | 4.5 | 4.1 | -0.4 |
| Human judgment | 4.2 | 4.0 | -0.2 |

Insight:

> "The largest perception gap is in clarity of expected AI use."

## 25.3 Human–AI Delegation Map

Heatmap לפי משימה:

Rows = management activities.  
Columns = Human-led / AI-assisted / AI-delegated / Autonomous.

אפשר toggle:

- Current state
- Opportunity

---

# 26. Organizational Enablement View

Dimensions:

- Access & Resources
- Policy & Governance
- Knowledge & Learning
- Culture
- Strategy

לכל dimension:

- score
- delta
- strongest item
- weakest item

Example insight:

> "Tool access improved, while policy clarity remained almost unchanged."

---

# 27. Trends View

מטרתו להציג שינוי לאורך זמן.

## Wave Timeline

```text
T0 Jan 2026
T1 Apr 2026
T2 Oct 2026
```

Chart selector:

- AI Literacy
- Agentic Work
- Organizational Enablement
- Agentic Management
- Impact

כל chart מציג:

- Overall organization
- Optional selected segment

### Comparability notice

אם השאלון השתנה:

> "This metric is based on 8 of 10 baseline items. Interpret trend with caution."

---

# 28. Filters & Segmentation

Client Dashboard filters מותרים:

- Wave
- Department
- Role family
- Manager / Employee
- Seniority group
- Location [if collected]

Privacy rule:

אם filter יוצר קבוצה קטנה מה-threshold:

> "This segment is hidden to protect respondent anonymity."

אין fallback להצגת data חלקי שעלול לזהות אדם.

---

# 29. AI Insight Engine

ה-AI מקבל רק aggregated analytical payload.

## פיצ'רים ב-V1

### 29.1 Generate Executive Insight

קלט:

- metric scores
- deltas
- n
- barriers
- manager/team gaps
- selected qualitative themes

פלט מובנה:

```json
{
  "summary": "",
  "key_changes": [],
  "risks": [],
  "opportunities": [],
  "recommended_priority": ""
}
```

### 29.2 Explain Change

כפתור ליד metric.

AI מסביר:

- מה השתנה.
- אילו metrics קשורים השתנו במקביל.
- מה ניתן להסיק.
- מה לא ניתן להסיק.

אסור לנסח causal claim ללא evidence.

### 29.3 Build Management Goals

ה-AI מציע 1–3 מטרות על בסיס פערים.

מבנה:

```json
{
  "title": "",
  "rationale": "",
  "related_metrics": [],
  "recommended_actions": [],
  "success_evidence": [],
  "suggested_review_period": ""
}
```

המטרה נשארת Draft עד שמנהל הפרויקט מאשר אותה.

### 29.4 Open-Text Theme Analysis

לפני AI:

- PII redaction.
- minimum response count.
- sampling/token management.

פלט:

- themes
- frequency
- sentiment/stance רק אם יש הצדקה מתודולוגית
- representative paraphrases

אין להציג ציטוטים שעלולים לזהות עובד ללא review.

---

# 30. AI Provider Architecture

שכבת abstraction:

```text
AIProvider
├── Cloudflare Workers AI
├── Groq
├── Enterprise Provider
└── Future Provider
```

Functions פנימיים:

```text
generateExecutiveSummary()
explainMetricChange()
generateManagementGoals()
analyzeOpenTextThemes()
```

אין קריאות LLM ישירות מה-frontend.

כל קריאה עוברת backend כולל:

- tenant validation
- payload sanitation
- audit logging
- rate limits
- structured output validation

---

# 31. Goal Management

מטרות הן ישות מערכתית, לא רק טקסט בדוח.

## Goal fields

- Title
- Description
- Owner
- Scope
- Related Metrics
- Baseline
- Target / Direction
- Actions
- Due date
- Status
- Notes
- Created by AI / Human
- Approved by

Statuses:

```text
Draft → Active → In Progress → Review → Completed / Archived
```

## Goal example

**Goal:** Redesign one recurring team workflow using Human–AI delegation.

Related metrics:

- Manage Human–AI Systems
- Delegation
- Verification

Evidence:

- workflow documented
- decision rights defined
- human review point defined
- T1 metric change

---

# 32. Goals Dashboard — Client

Cards:

### Active Priorities

כל goal מציג:

- owner
- due date
- related metric
- progress
- baseline

### Measurement Connection

לדוגמה:

```text
Manage Human–AI Systems
Baseline: 2.8
Current: 3.4
↑ +0.6
```

המטרה היא לחבר action ל-measurement.

---

# 33. Client Dashboard Access

בצד NGG:

`Dashboard Access` tab.

אפשרויות:

- Invite Client User
- Set role
- Revoke access
- Set expiration [optional]
- Restrict to project

## Access model

עדיפות לחשבון מאומת ולא public share link עבור הנהלה.

Invite flow:

1. Email
2. Role
3. Project access
4. Send invite

Client user sees only tenant שלו.

---

# 34. Dashboard Sharing

שלוש רמות אפשריות:

### Secure Login
ברירת מחדל.

### Executive Snapshot Link [V2]
Read-only, expiring, ללא filters רגישים.

### PDF Export [V2]
Executive report שנוצר מה-dash.

כל export צריך לכלול:

- wave
- date
- filters
- methodology note

---

# 35. Methodology Page — Client

חשוב ליצירת אמון.

מציג:

- מה נמדד.
- אילו scales מבוססים מחקרית.
- אילו מדדים הם NGG proprietary.
- sample size.
- collection dates.
- anonymity threshold.
- limitations.

לא להציג scoring implementation רגיש או IP מלא.

---

# 36. Client Settings

- Name
- Logo
- Industry
- Organization size
- Departments
- Role families
- Language
- Branding
- Privacy threshold
- Default survey contact

Project Manager יכול להגדיר segment taxonomy מראש.

---

# 37. Data Model — High Level

```text
Workspace
  id
  name

Client
  id
  workspace_id
  name
  branding
  privacy_settings

Project
  id
  client_id
  manager_id
  name
  status

Questionnaire
  id
  project_id
  version
  status

Section
  id
  source_section_id
  questionnaire_id
  order
  audience

Question
  id
  canonical_question_id
  version
  source_type
  scoring_key

Wave
  id
  project_id
  questionnaire_snapshot_id
  type
  start_at
  end_at

Respondent
  id
  wave_id
  pseudo_identifier
  segment_attributes

Response
  id
  respondent_id
  question_id
  value

MetricResult
  wave_id
  metric_id
  segment_key
  score
  n

Insight
  id
  wave_id
  type
  ai_generated
  approved_by

Goal
  id
  project_id
  owner
  metric_links
  status
```

---

# 38. Questionnaire Versioning

ברגע ש-Wave פורסם:

- Questionnaire snapshot הופך immutable.
- שינוי questionnaire יוצר version חדש.
- Follow-up יכול להתחיל מ-copy של version קודם.

Version example:

```text
Questionnaire 1.0 → T0
Questionnaire 1.1 → T1
```

Diff viewer:

- Added questions
- Removed questions
- Modified custom questions
- Comparable metrics affected

---

# 39. Privacy & Security Requirements

## חובה

- Tenant isolation.
- RBAC.
- Encryption in transit and at rest.
- No client-to-client access.
- Audit log for admin actions.
- Configurable retention policy.
- PII separation from response table.
- Minimum group threshold.
- AI payload sanitization.

## Sensitive fields

אם longitudinal tracking נדרש:

Identity mapping נשמר בטבלה נפרדת.

```text
identity_table
user_email → respondent_hash
```

Analytics layer עובד רק עם `respondent_hash`.

---

# 40. Audit Log

אירועים לדוגמה:

- Client created
- Questionnaire changed
- Validated module removed
- Wave launched
- Dashboard user invited
- Client access revoked
- AI insight generated
- AI insight approved
- Goal created
- Data exported

מיועד לאבטחה, QA ושחזור תהליכים.

---

# 41. Notifications

## NGG

- Low response rate
- Wave ending soon
- Follow-up due
- Client access request
- Insight pending review

## Client

- New results available
- New goal assigned
- Follow-up measurement published

V1 יכול להתחיל ב-in-app + email transactional בסיסי.

---

# 42. Empty / Loading / Error States

## Empty client

> "No assessment has been launched yet. Build the first questionnaire to create a baseline."

CTA:

`Create Baseline Assessment`

## No comparison

> "Trend data will appear after the next measurement wave."

## Small segment

> "Results are hidden because the selected group is too small to protect anonymity."

## AI error

אסור להסתיר כשל.

> "AI analysis is temporarily unavailable. Your measurement data is unaffected."

---

# 43. Visual Language

המערכת צריכה להרגיש כמו שילוב של:

- modern B2B analytics
- consulting diagnostic tool
- research platform

לא כמו LMS ולא כמו Google Forms.

## עקרונות

- Minimal
- Data first
- High whitespace
- Neutral professional palette
- Accent color של NGG + branding מוגבל ללקוח
- Charts פשוטים וברורים
- לא להשתמש ב-gamification
- לא להשתמש ב-score gauges דרמטיים
- שימוש זהיר במונחי maturity

### RTL

עברית היא first-class language.

כל layout חייב לתמוך RTL אמיתי, כולל charts, tables ו-filters.

---

# 44. Mobile

## Survey
Mobile-first חובה.

## Client Dashboard
Responsive לצפייה, אבל dashboard analysis optimized for desktop/tablet.

## Admin Builder
Desktop/tablet priority. אין חובה לתמוך בבניית שאלון מלאה בטלפון ב-V1.

---

# 45. Accessibility

- WCAG AA target.
- Keyboard navigation.
- Contrast compliant.
- Chart values available in text/table form.
- לא להעביר משמעות בצבע בלבד.
- Labels מלאים לכל controls.

---

# 46. MVP Scope

## V1 — Must Have

### Admin
- Authentication
- Client management
- Project management
- Role-based access
- Questionnaire library
- Modular questionnaire builder
- Locked research scales
- Custom questions
- Routing manager/non-manager
- Preview
- Wave creation
- Survey link
- Response monitoring

### Analytics
- Measurement engine
- Basic segmentation
- Longitudinal comparison
- Manager–team gap
- Privacy threshold

### Client Dashboard
- Overview
- Adoption
- Management
- Organization
- Trends
- Goals
- Secure client access

### AI
- Executive Summary
- Explain Change
- Suggested Management Goals
- Open-text thematic analysis
- Human review before publish

---

# 47. V1.5

- Questionnaire approval flow
- Advanced wave diff
- Confidence intervals / effect size
- Scheduled follow-up reminders
- Goal review cycles
- Better qualitative coding UI
- Dashboard annotations for interventions

---

# 48. V2

- Chat with your organization
- Benchmarks across anonymized clients
- AI Decision Rights Tool
- Human–AI Delegation Canvas interactive workflow
- Intervention library
- Client self-service questionnaire request
- PDF report generation
- SSO/SAML
- API integrations
- HRIS sync
- Microsoft/Google workspace connectors
- Behavioral usage signals beyond surveys

---

# 49. Critical Product Decisions Before Development

לפני התחלת פיתוח יש לסגור:

1. האם baseline core הוא חובה בכל פרויקט או רק recommendation.
2. האם NGG מאפשר Client Admin ליצור משתמשים בעצמו.
3. האם longitudinal tracking יהיה anonymous cohort או pseudonymous individual.
4. threshold ברירת מחדל להצגת segment.
5. אילו demographic/organizational attributes מותרים.
6. כמה חופש יש למנהל פרויקט לשנות NGG measures.
7. האם AI insights מתפרסמים ללקוח רק לאחר אישור NGG.
8. provider policy ל-AI ו-data residency.
9. retention period ל-raw responses.
10. האם client dashboard הוא חלק מכל פרויקט או add-on מסחרי.

---

# 50. Recommended Product Decisions

המלצת האפיון ל-V1:

- Baseline core: **recommended + protected**, לא חובה מוחלטת.
- Validated scale items: **locked**.
- NGG scale items: **module-level customization**, שינוי שאלה יוצר custom/versioned item.
- Individual response access: **NGG restricted only**, לא לקוח.
- Client dashboard: **aggregate only**.
- Privacy threshold: **n ≥ 7** כברירת מחדל.
- AI insights: **draft until NGG approves**.
- Follow-up wave: **clone previous questionnaire by default**.
- Client login: **secure authenticated access**, לא public URL.
- Raw text to AI: **redacted + aggregated/sampled only**.

---

# 51. Key User Flows

## Flow A — הקמת לקוח חדש

```text
Clients
→ New Client
→ Client Details
→ Create Project
→ Assign Project Manager
→ Select Baseline Template
→ Questionnaire Builder
→ Preview
→ Publish Wave
```

## Flow B — התאמת שאלון

```text
Assessment
→ Edit Questionnaire
→ Select Sections
→ Configure Audience
→ Add Client Questions
→ Review Research Warnings
→ Preview Employee
→ Preview Manager
→ Save Version
```

## Flow C — שיתוף דשבורד

```text
Client Workspace
→ Dashboard Access
→ Invite User
→ Set Client Admin / Viewer
→ Send Invite
→ User verifies account
→ Client Dashboard
```

## Flow D — Follow-up

```text
Waves
→ New Follow-up Wave
→ Clone T0
→ Show Questionnaire Diff
→ Confirm Comparable Core
→ Launch
→ Compare T1 vs T0
→ Generate AI Change Analysis
```

## Flow E — יצירת יעד ניהולי

```text
Management Dashboard
→ Select Weak/Strategic Metric
→ Generate Goal with AI
→ Edit
→ Assign Owner
→ Set Review Date
→ Publish to Client Dashboard
→ Track in next Wave
```

---

# 52. Screen Inventory

## NGG

1. Login
2. Portfolio Overview
3. Clients List
4. New Client
5. Client Overview
6. Project Overview
7. Questionnaire Library
8. Questionnaire Builder
9. Question Editor
10. Preview
11. Wave Setup
12. Wave Monitoring
13. Internal Results
14. AI Insight Review
15. Goals Manager
16. Dashboard Access
17. Users & Roles
18. Settings
19. Audit Log

## Respondent

20. Survey Landing
21. Survey Section
22. Survey Completion

## Client

23. Client Login
24. Dashboard Overview
25. AI Adoption
26. Management
27. Organizational Enablement
28. Trends
29. Goals
30. Methodology

---

# 53. Acceptance Criteria — Questionnaire Builder

ה-Builder נחשב מוכן ל-V1 כאשר מנהל פרויקט יכול:

- להקים questionnaire ללא עזרת מפתח.
- להוסיף ולהסיר modules.
- לראות research status של כל module.
- לא לשנות בטעות validated item.
- להוסיף custom questions.
- לקבוע routing למנהלים.
- לראות זמן מילוי משוער.
- לבצע preview לפי persona.
- לשמור version.
- לראות warning אם נפגעת comparability.

---

# 54. Acceptance Criteria — Client Dashboard

הדשבורד נחשב מוכן כאשר משתמש לקוח מורשה יכול:

- להיכנס רק לארגון שלו.
- לראות wave נוכחי.
- להשוות ל-baseline.
- לראות core metrics.
- לראות manager/team gaps.
- לבצע פילוח בלי לחשוף קבוצות קטנות.
- לראות insights שאושרו בלבד.
- לראות goals פעילים.
- להבין את methodology של המדידה.

---

# 55. Acceptance Criteria — AI

AI feature נחשב תקין כאשר:

- המודל אינו מקבל raw identifiable data.
- קלט כולל score + n + wave + comparison context.
- הפלט עובר JSON schema validation.
- כל insight שומר evidence references למדדים שמהם נוצר.
- אין פרסום אוטומטי ללקוח ללא review ב-V1.
- hallucinated metric names נדחים.
- אם אין מספיק evidence, המודל מחזיר insufficient evidence במקום מסקנה.

---

# 56. Success Metrics של המוצר

## Adoption

- זמן ממוצע להקמת לקוח.
- זמן ממוצע לבניית questionnaire.
- אחוז פרויקטים שמשתמשים ב-template קיים.

## Survey

- Completion rate.
- Median completion time.
- Drop-off by section.

## Client Value

- Dashboard monthly active client users.
- Number of insights viewed.
- Number of goals created.
- Follow-up wave adoption rate.

## NGG Value

- % clients returning for T1.
- Project setup time saved.
- Number of reusable modules.
- Number of interventions linked to measured change.

---

# 57. North Star

מדד העל שהייתי שואף אליו אינו מספר הכניסות לדשבורד, אלא:

> **Percentage of client projects that complete a second measurement wave and can demonstrate a measurable change linked to an intervention or management goal.**

זה המדד שמוכיח שהמערכת הפכה מסקר חד-פעמי לכלי הטמעה מתמשך.

---

# 58. חזון המוצר

בטווח הקצר המערכת מאפשרת ל-NGG להקים ולנהל אבחוני AI מותאמים בצורה מקצועית וחוזרת.

בטווח הבינוני היא הופכת למערכת שמחברת בין:

```text
Assessment
   ↓
Organizational Insight
   ↓
Management Goals
   ↓
Interventions
   ↓
Follow-up Measurement
   ↓
Evidence of Change
```

בטווח הארוך, עם הצטברות נתונים מספקת, NGG יכולה לבנות שכבת benchmark שמאפשרת לארגון להבין לא רק "האם השתפרנו", אלא גם:

> "כיצד אנחנו נראים ביחס לארגונים דומים, אילו דפוסים מנבאים אימוץ בשל יותר, ואילו התערבויות באמת קשורות לשינוי לאורך זמן?"

זהו הערך האסטרטגי המרכזי של המוצר והבסיס האפשרי ל-IP ארגוני משמעותי סביב **AI Adoption, Agentic Work ו-Agentic Management**.
