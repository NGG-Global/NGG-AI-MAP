# NGG AI Adoption & Agentic Management Assessment
## Master Questionnaire Copy — Hebrew Production Version v1.0

**Status:** Production copy for implementation and pilot  
**Primary language:** Hebrew (RTL)  
**Purpose:** Single source of truth for all default questionnaire wording, answer scales, routing, scoring associations, and source status in the NGG AI Assessment platform.  
**Copy version:** `questionnaire-copy-he-1.0`  

---

# 1. Important measurement note

The platform contains three different types of questionnaire content:

1. **Validated source scale** — a scale whose source version has published psychometric validation. The source wording, item order, response scale, and scoring logic should be locked in the Questionnaire Builder.
2. **NGG research-informed measure** — original NGG items based on the research framework. These are not yet independently validated scales and must not be presented to clients as such.
3. **Client custom question** — project-specific questions added for an individual client. These do not automatically contribute to core NGG metrics.

## Hebrew versions of validated source scales

The two source scales included in V1 are:

- **Generative Artificial Intelligence Literacy (GAIL), 17 items** — Liu, Zhang & Wei (2025).
- **Short Trust in Automation Scale (S-TIAS), 3 items** — McGrath, Lack, Tisch & Duenser (2025).

Both source publications are open access under **CC BY**. The Hebrew wording in this document is an **NGG Hebrew adaptation prepared for implementation**. It has not yet undergone an independent Hebrew psychometric validation process. Therefore the UI and methodology page should use wording such as:

> מבוסס על סולם מתוקף; הגרסה העברית היא התאמה של NGG וטרם עברה תיקוף פסיכומטרי עצמאי.

Do **not** label the Hebrew version itself as "validated in Hebrew" until a formal translation/validation procedure is completed.

Recommended future validation process:

`forward translation → independent back translation → expert review → cognitive interviews → pilot → reliability/CFA → longitudinal invariance testing`

---

# 2. Global terminology

Throughout the respondent experience use the term **AI** after the opening definition.

Default definition:

> **בינה מלאכותית גנרטיבית (Generative AI)** מתייחסת כאן לכלים שמסוגלים ליצור, לעבד או לנתח תוכן ומידע — לדוגמה ChatGPT, Claude, Gemini, Microsoft Copilot וכלים ארגוניים דומים. המונח כולל גם כלים או סוכני AI שמסוגלים לבצע כמה שלבים או פעולות כחלק ממשימה.

Do not use the terms “agent”, “agentic”, “LLM” or “orchestration” in respondent-facing copy unless they are explained in plain language.

---

# 3. Default survey opening

## `INTRO_01` — Title

**איך AI משתלב בעבודה שלנו?**

## `INTRO_02` — Intro text

> השאלון נועד להבין כיצד AI משתלב כיום בעבודה שלך ובסביבת העבודה בארגון, מה כבר עובד היטב, היכן קיימים חסמים ואילו הזדמנויות עדיין לא ממומשות.
>
> אין תשובות נכונות או לא נכונות. אנחנו מעוניינים בתמונה אמיתית של המצב כיום — גם אם אינך משתמש/ת ב-AI כלל או שהשימוש שלך עדיין מצומצם.
>
> כאשר אנחנו כותבים **AI**, הכוונה היא לכלים מבוססי בינה מלאכותית גנרטיבית, כגון ChatGPT, Claude, Gemini, Microsoft Copilot וכלים ארגוניים דומים, וכן לכלים או סוכנים שמסוגלים לבצע מספר שלבים כחלק ממשימה.

## `INTRO_03` — Privacy block

Default copy; allow project manager to customize only the bracketed fields:

> התשובות שלך ישמשו לניתוח ארגוני ולשיפור תהליכי ההטמעה של AI ב-[שם הארגון]. התוצאות יוצגו להנהלה באופן מצרפי בלבד, ולא יוצגו תשובות אישיות מזוהות.
>
> קבוצות קטנות מדי לא יוצגו בנפרד, כדי לשמור על פרטיות המשיבים.
>
> מילוי השאלון אורך כ-[X] דקות.

If the wave is pseudonymous longitudinal, append:

> לצורך השוואה לאורך זמן, המערכת עשויה לקשר בין המענה שלך במדידות שונות באמצעות מזהה פנימי שאינו מוצג להנהלת הארגון.

## `INTRO_04` — CTA

**מתחילים**

---

# 4. Section A — רקע תעסוקתי

**Section ID:** `SECTION_CONTEXT`  
**Source type:** NGG / Client-configurable  
**Audience:** All  
**Recommended:** Yes  

Intro:

> כמה פרטים כלליים שיעזרו לנו להבין את התוצאות ברמת הארגון. המידע יוצג רק בקבוצות גדולות מספיק לשמירה על פרטיות.

### `CTX_01` — יחידה ארגונית

**שאלה:**
> באיזו יחידה או מחלקה עיקרית את/ה עובד/ת?

**Type:** Single choice  
**Options:** Configured per client  
**Allow:** `אחר / לא מופיע ברשימה`  

### `CTX_02` — משפחת תפקיד

**שאלה:**
> מה מתאר בצורה הטובה ביותר את סוג התפקיד שלך?

**Default options:**
- ניהול
- מקצועי / מומחה
- טכנולוגיה / פיתוח / דאטה
- תפעול / פרויקטים
- מכירות / שיווק / שירות
- משאבי אנוש / למידה ופיתוח
- כספים / משפטי / רכש
- אדמיניסטרציה
- אחר

Client may customize this taxonomy.

### `CTX_03` — אחריות ניהולית

**שאלה:**
> האם יש לך אחריות ניהולית ישירה על עובדים?

**Options:**
- כן
- לא

**Routing:** If `כן` → show `CTX_04` and manager modules.

### `CTX_04` — מספר כפיפים ישירים

**שאלה:**
> כמה עובדים מדווחים אליך ישירות?

**Options:**
- 1–3
- 4–7
- 8–15
- 16 ומעלה

### `CTX_05` — ותק בארגון

**שאלה:**
> כמה זמן את/ה עובד/ת בארגון?

**Options:**
- פחות משנה
- שנה עד 3 שנים
- 4–7 שנים
- 8 שנים ומעלה

---

# 5. Section B — שימוש ב-AI בעבודה

**Section ID:** `SECTION_AI_USAGE`  
**Source type:** NGG research-informed behavioral diagnostic  
**Audience:** All  
**Recommended Core:** Yes  

Intro:

> השאלות הבאות עוסקות במה שקורה בפועל בעבודה שלך כיום.

### `USE_01` — תדירות שימוש

**שאלה:**
> באיזו תדירות השתמשת בכלי AI לצורכי העבודה במהלך 30 הימים האחרונים?

**Options:**
1. לא השתמשתי כלל
2. פחות מפעם בשבוע
3. 1–2 ימים בשבוע
4. 3–4 ימים בשבוע
5. כמעט בכל יום עבודה
6. מספר פעמים ביום

**Routing:** If `לא השתמשתי כלל`, skip experience-dependent modules: S-TIAS, Verification Behavior and Agentic Work. Continue to Organizational Enablement and barriers.

### `USE_02` — כלים בשימוש

**Display if:** `USE_01 != לא השתמשתי כלל`

**שאלה:**
> באילו סוגי כלי AI השתמשת לצורכי עבודה במהלך 30 הימים האחרונים?

**Type:** Multi-select

**Default options:**
- ChatGPT
- Claude
- Gemini
- Microsoft Copilot
- כלי AI ארגוני פנימי
- כלי AI למחקר או חיפוש
- כלי AI לכתיבה או יצירת תוכן
- כלי AI לניתוח נתונים
- כלי AI לקוד או פיתוח
- כלי AI ליצירת תמונה, וידאו או אודיו
- כלי אוטומציה או AI שמבצע מספר פעולות ברצף
- אחר

Project manager may add client-specific approved tools.

### `USE_03` — כלי עיקרי

**Display if:** Respondent selected more than one tool/category in `USE_02`.

**שאלה:**
> באיזה כלי AI את/ה משתמש/ת הכי הרבה לצורכי העבודה?

**Type:** Single choice from respondent’s selected tools.

**System field:** `primary_ai_tool`

If only one specific tool was selected, set it automatically where possible.

### `USE_04` — סוגי משימות

**Display if:** AI user

**שאלה:**
> באילו סוגי משימות את/ה משתמש/ת ב-AI כיום?

**Type:** Multi-select

**Options:**
- כתיבה ועריכה
- סיכום מסמכים, פגישות או מידע
- חיפוש ומחקר
- סיעור מוחות ופיתוח רעיונות
- ניתוח נתונים או מידע
- הכנת מצגות או דוחות
- ניתוח חלופות ותמיכה בקבלת החלטות
- תכנון עבודה, משימות או פרויקטים
- תקשורת עם עובדים, לקוחות או בעלי עניין
- קוד, פיתוח או משימות טכניות
- אוטומציה של תהליך עבודה
- למידה והתפתחות מקצועית
- יצירת תמונה, וידאו או אודיו
- אחר

### `USE_05` — שילוב בשגרת העבודה

**Display if:** AI user

**שאלה:**
> באיזו מידה AI כבר הפך לחלק קבוע מהדרך שבה את/ה מבצע/ת את העבודה שלך?

**Scale 1–5:**
1. כמעט בכלל לא
2. במידה מועטה
3. במידה בינונית
4. במידה רבה
5. במידה רבה מאוד

### `USE_06` — אוטומציה חוזרת

**Display if:** AI user

**שאלה:**
> האם יש כיום משימות חוזרות בעבודה שלך שבהן AI מבצע חלק מהעבודה באופן אוטומטי או כמעט אוטומטי?

**Options:**
- לא
- כן, במשימה חוזרת אחת
- כן, בכמה משימות חוזרות
- כן, בחלק משמעותי מתהליך העבודה שלי
- לא בטוח/ה

### `USE_07` — גישה לכלים

**שאלה:**
> באיזו מידה יש לך גישה לכלי ה-AI הנדרשים לך כדי לבצע את עבודתך בצורה יעילה?

**Scale 1–5:**
1. אין לי גישה מספקת
2. גישה מוגבלת
3. גישה חלקית
4. גישה טובה
5. יש לי את הכלים הנדרשים לי

**Additional option:** `לא רלוונטי לתפקיד שלי`

---

# 6. Section C — אוריינות AI גנרטיבית (GAIL)

**Section ID:** `SECTION_GAIL_17`  
**Metric ID:** `gail_total`  
**Source type:** Validated source scale + NGG Hebrew adaptation  
**Locked:** Yes  
**Audience:** All respondents unless project explicitly removes module  
**Items:** 17  
**Source response scale:** 7-point Likert, 1 = Strongly disagree, 7 = Strongly agree  

## Respondent intro

> השאלות הבאות עוסקות בידע וביכולת שלך לעבוד עם AI גנרטיבי. גם אם הניסיון שלך מוגבל, חשוב לענות לפי התחושה שלך כיום.
>
> עד כמה את/ה מסכים/ה עם כל אחד מהמשפטים הבאים?

**Response scale:**
1. כלל לא מסכים/ה
2. לא מסכים/ה
3. נוטה לא להסכים
4. לא מסכים/ה ולא לא מסכים/ה
5. נוטה להסכים
6. מסכים/ה
7. מסכים/ה מאוד

Do not randomize items.

## C1 — מיומנויות תפעול בסיסיות

### `GAIL_BOS_01`
> אני מבין/ה את העקרונות והמגבלות של כלי ה-AI שבהם אני משתמש/ת.

### `GAIL_BOS_02`
> אני יודע/ת להשתמש היטב בפונקציות המרכזיות וביכולות השיתופיות של כלי AI.

### `GAIL_BOS_03`
> אני מסוגל/ת לפתור בעיות טכניות נפוצות שעולות במהלך השימוש ב-AI.

## C2 — יכולת ניסוח ושיפור הנחיות

### `GAIL_PE_01`
> אני מסוגל/ת לנסח הנחיות אפקטיביות ל-AI בהתאם לדרישות המשימה.

### `GAIL_PE_02`
> אני מסוגל/ת לשפר הנחיות ל-AI באמצעות שילוב של מונחים מקצועיים ודוגמאות.

### `GAIL_PE_03`
> אני מסוגל/ת לשפר את ההנחיות שלי ל-AI באופן מתמשך בהתאם לתוצרים ולמשוב שאני מקבל/ת.

## C3 — הערכת איכות התוצרים

### `GAIL_QE_01`
> אני מסוגל/ת להעריך את הדיוק והאמינות של תוכן שנוצר באמצעות AI.

### `GAIL_QE_02`
> אני מסוגל/ת להעריך את העקביות והקוהרנטיות של תוכן שנוצר באמצעות AI.

### `GAIL_QE_03`
> אני מסוגל/ת להעריך את ההיגיון והשלמות של תוכן שנוצר באמצעות AI.

## C4 — יישום חדשני

### `GAIL_IA_01`
> אני מסוגל/ת לזהות ולנצל הזדמנויות חדשות בעבודה שלי באמצעות AI.

### `GAIL_IA_02`
> אני מסוגל/ת להשתמש ב-AI כדי לפתח רעיונות יצירתיים וחדשניים בעבודה שלי.

### `GAIL_IA_03`
> אני מסוגל/ת להפוך רעיונות חדשניים לתוצרים מעשיים באמצעות AI.

## C5 — אתיקה וציות

### `GAIL_EC_01`
> אני מסוגל/ת להימנע מסיכונים אתיים בעת שימוש ב-AI.

### `GAIL_EC_02`
> אני מסוגל/ת להגן על פרטיות ועל מידע רגיש בעת שימוש ב-AI.

### `GAIL_EC_03`
> אני מסוגל/ת לפעול בהתאם לחוקים ולרגולציה הרלוונטיים לשימוש ב-AI.

### `GAIL_EC_04`
> אני מסוגל/ת לפעול בהתאם להנחיות הארגון בנוגע לשימוש ב-AI.

### `GAIL_EC_05`
> אני מסוגל/ת להשתמש ב-AI בהתאם לכללי האתיקה והסטנדרטים המקצועיים הרלוונטיים לתפקיד שלי.

## Scoring

Calculate:
- `gail_total` = mean of all 17 items
- `gail_basic_operation` = mean BOS 1–3
- `gail_prompt_engineering` = mean PE 1–3
- `gail_quality_evaluation` = mean QE 1–3
- `gail_innovative_application` = mean IA 1–3
- `gail_ethics_compliance` = mean EC 1–5

Do not reverse-score any item.

For V1, all 17 scale items should be required once the module is shown. If a future implementation allows item-level non-response, define a missing-data rule before calculating scores.

---

# 7. Section D — Agentic Work

**Section ID:** `SECTION_AGENTIC_WORK`  
**Source type:** NGG experimental/research-informed measure  
**Audience:** AI users  
**Validated:** No  
**Recommended Core:** Yes  

Intro:

> השאלות הבאות עוסקות בעומק העבודה שלך עם AI — משימוש נקודתי ועד שילוב שלו בתהליכי עבודה מורכבים יותר.
>
> כאשר הדבר רלוונטי למשימה שלך, באיזו תדירות את/ה פועל/ת כך?

**Scale:**
1. אף פעם
2. לעיתים רחוקות
3. לפעמים
4. לעיתים קרובות
5. כמעט תמיד

Additional option: `לא רלוונטי לעבודה שלי`

## Assist

### `AW_ASSIST_01`
> אני משתמש/ת ב-AI כדי ליצור טיוטה, לסכם מידע או לקבל נקודת פתיחה למשימה.

## Collaborate

### `AW_COLLAB_01`
> אני עובד/ת עם ה-AI במספר סבבים ומשפר/ת את התוצר יחד איתו.

### `AW_COLLAB_02`
> אני מספק/ת ל-AI הקשר, דוגמאות, מגבלות או קריטריונים כדי לשפר את התוצאה.

## Delegate

### `AW_DELEGATE_01`
> אני מעביר/ה ל-AI משימות שכוללות כמה שלבים, ולא רק בקשה בודדת.

### `AW_DELEGATE_02`
> לפני שאני מעביר/ה משימה מורכבת ל-AI, אני מגדיר/ה מראש מה ייחשב תוצר מוצלח.

## Orchestrate

### `AW_ORCH_01`
> אני משלב/ת AI כחלק מתהליך עבודה קבוע שחוזר על עצמו.

### `AW_ORCH_02`
> אני מאפשר/ת ל-AI להשתמש בכמה מקורות מידע, כלים או מערכות כחלק מביצוע משימה.

### `AW_ORCH_03`
> בתהליכים מתקדמים, אני מגדיר/ה מראש באילו שלבים ה-AI יכול להתקדם באופן עצמאי ובאילו שלבים נדרשת התערבות אנושית.

## V1 interpretation

Do not classify respondents into hard maturity stages yet.

Recommended outputs:
- item prevalence
- sub-dimension means
- organization-level funnel indicators

Example dashboard language:
`Assist → Collaborate → Delegate → Orchestrate`

---

# 8. Section E — אמון ובקרה על תוצרי AI

## E1 — Short Trust in Automation Scale (S-TIAS)

**Section ID:** `SECTION_STIAS_3`  
**Metric ID:** `stias_trust`  
**Source type:** Validated source scale + NGG Hebrew adaptation  
**Locked:** Yes  
**Audience:** AI users  
**Items:** 3  

### Context instruction

The S-TIAS should refer to a **specific system**, not AI in general.

Display:

> בשלוש השאלות הבאות, חשוב/י על כלי ה-AI שבו את/ה משתמש/ת הכי הרבה לצורכי העבודה: **[primary_ai_tool]**.
>
> באיזו מידה כל אחד מהמשפטים הבאים מתאר את התחושה שלך כלפי הכלי הזה?

If no specific tool can be identified, display:

> בשלוש השאלות הבאות, חשוב/י על כלי ה-AI שבו את/ה משתמש/ת הכי הרבה לצורכי העבודה.

**Source response scale:** 1 = Not at all; 7 = Extremely.

**Hebrew response scale:**
1. בכלל לא
2. במידה מועטה מאוד
3. במידה מועטה
4. במידה בינונית
5. במידה רבה
6. במידה רבה מאוד
7. במידה רבה ביותר

### `STIAS_01`
> יש לי ביטחון ב-[primary_ai_tool].

Fallback:
> יש לי ביטחון בכלי ה-AI העיקרי שבו אני משתמש/ת.

### `STIAS_02`
> [primary_ai_tool] הוא כלי אמין.

Fallback:
> כלי ה-AI העיקרי שבו אני משתמש/ת הוא אמין.

### `STIAS_03`
> אני יכול/ה לסמוך על [primary_ai_tool].

Fallback:
> אני יכול/ה לסמוך על כלי ה-AI העיקרי שבו אני משתמש/ת.

## Scoring

`stias_trust` = mean of all 3 items.

Do not interpret higher trust as automatically better.

---

## E2 — Verification Behavior

**Section ID:** `SECTION_VERIFICATION`  
**Metric ID:** `verification_behavior`  
**Source type:** NGG research-informed measure  
**Audience:** AI users  

Intro:

> כאשר את/ה משתמש/ת בתוצר של AI לצורך עבודה משמעותית, באיזו תדירות את/ה עושה את הדברים הבאים?

**Scale:**
1. אף פעם
2. לעיתים רחוקות
3. לפעמים
4. לעיתים קרובות
5. כמעט תמיד

Additional option: `לא רלוונטי לעבודה שלי`

### `VERIFY_01`
> אני בודק/ת אם העובדות או הנתונים המרכזיים בתוצר נכונים לפני שאני מסתמך/ת עליו.

### `VERIFY_02`
> כאשר איני יכול/ה לאמת מידע משמעותי שה-AI מספק, אני נמנע/ת מלהתייחס אליו כאילו הוא ודאי.

### `VERIFY_03`
> אני מתאים/ה את רמת הבדיקה שאני מבצע/ת לרמת הסיכון או החשיבות של המשימה.

## Combined interpretation with trust

Recommended four-quadrant diagnostic, not a psychometric score:

- High Trust + High Verification → calibrated confidence
- High Trust + Low Verification → over-reliance risk
- Low Trust + High Verification → cautious / potentially under-trusting
- Low Trust + Low Verification → low engagement / disengagement

Do not present these labels as clinical or validated classifications.

---

# 9. Section F — סביבת העבודה והטמעת AI בארגון

**Section ID:** `SECTION_ORG_ENABLEMENT`  
**Metric ID:** `organizational_ai_enablement`  
**Source type:** NGG research-informed measure  
**Audience:** All  
**Validated:** No  

Intro:

> השאלות הבאות עוסקות בתנאים שהארגון מספק לשימוש יעיל ואחראי ב-AI.
>
> עד כמה את/ה מסכים/ה עם כל אחד מהמשפטים הבאים?

**Scale 1–5:**
1. כלל לא מסכים/ה
2. לא מסכים/ה
3. לא מסכים/ה ולא לא מסכים/ה
4. מסכים/ה
5. מסכים/ה מאוד

Additional option: `לא יודע/ת`

## Access & Resources

### `ORG_ACCESS_01`
> יש לי גישה לכלי AI מאושרים שמתאימים לצורכי העבודה שלי.

### `ORG_ACCESS_02`
> ניתן לשלב את כלי ה-AI בצורה יעילה עם המידע, המערכות או התהליכים שאני צריך/ה בעבודה.

## Policy & Governance

### `ORG_POLICY_01`
> ברור לי איזה מידע מותר ואסור להזין לכלי AI במסגרת העבודה.

### `ORG_POLICY_02`
> ברור לי באילו מצבים ניתן להסתמך על AI ובאילו מצבים נדרשת מעורבות או בדיקה אנושית.

## Knowledge & Learning

### `ORG_LEARN_01`
> הארגון מספק לי הזדמנויות מספקות ללמוד כיצד להשתמש ב-AI בעבודה.

### `ORG_LEARN_02`
> כשאני זקוק/ה לעזרה בשימוש ב-AI, ברור לי למי או לאן ניתן לפנות.

## Culture

### `ORG_CULTURE_01`
> אני מרגיש/ה בטוח/ה להתנסות בדרכים חדשות להשתמש ב-AI בעבודה, גם אם לא כל ניסיון מצליח.

### `ORG_CULTURE_02`
> עובדים בארגון משתפים זה עם זה דרכים אפקטיביות להשתמש ב-AI.

## Strategy

### `ORG_STRATEGY_01`
> ברור לי כיצד השימוש ב-AI מתחבר למטרות של הארגון או היחידה שלי.

### `ORG_STRATEGY_02`
> אני רואה מחויבות אמיתית מצד הארגון לשילוב אחראי ומועיל של AI.

## Scoring

Calculate dimension means:
- Access & Resources
- Policy & Governance
- Knowledge & Learning
- Culture
- Strategy

Overall organizational enablement may be shown as a summary mean, but the five dimensions should remain visible.

Exclude `לא יודע/ת` from numeric calculation.

---

# 10. Section G — חוויית הניהול בעידן AI

**Section ID:** `SECTION_MANAGER_EXPERIENCE`  
**Source type:** NGG research-informed measure  
**Audience:** Respondents with a direct manager; non-managers and managers may both answer about their own manager  
**Validated:** No  

Pre-question if needed:

### `MEXP_SCREEN_01`
> האם יש לך מנהל/ת ישיר/ה שאת/ה עובד/ת מולו/ה באופן שוטף?

Options:
- כן
- לא

If `לא`, skip section.

Intro:

> השאלות הבאות עוסקות באופן שבו הניהול הישיר שלך תומך בעבודה עם AI.

**Scale 1–5:**
1. כלל לא מסכים/ה
2. לא מסכים/ה
3. לא מסכים/ה ולא לא מסכים/ה
4. מסכים/ה
5. מסכים/ה מאוד

Additional option: `לא רלוונטי / לא יכול/ה להעריך`

### `MEXP_01`
> המנהל/ת שלי מבהיר/ה לצוות מה מצופה מאיתנו בנוגע לשימוש ב-AI.

**Mirror:** `AM_HUMANS_01`

### `MEXP_02`
> המנהל/ת שלי עוזר/ת לנו לזהות משימות והזדמנויות שבהן AI יכול לשפר את העבודה.

**Mirror:** `AM_HUMANS_02`

### `MEXP_03`
> המנהל/ת שלי יוצר/ת סביבה שבה אפשר להתנסות ב-AI, לשתף הצלחות וגם לדבר על כשלים.

**Mirror:** `AM_HUMANS_03`

### `MEXP_04`
> כאשר AI משולב בתהליך עבודה של הצוות, ברור מי אחראי על כל שלב ועל התוצאה הסופית.

**Mirror:** `AM_SYSTEMS_02`

### `MEXP_05`
> המנהל/ת שלי מעודד/ת אותנו לבדוק, לאתגר ולבקר תוצרים של AI כשצריך.

**Mirror concept:** `AM_SELF_03` / `AM_AI_03`

### `MEXP_06`
> המנהל/ת שלי מקפיד/ה שהשימוש ב-AI לא יחליף שיקול דעת, שיחה או יחס אנושי במקומות שבהם הם נדרשים.

**Mirror:** `AM_HUMANS_04`

---

# 11. Section H — המנהל בעידן AI / Agentic Management

**Section ID:** `SECTION_AGENTIC_MANAGEMENT`  
**Source type:** NGG proprietary experimental framework  
**Audience:** Managers only (`CTX_03 = כן`)  
**Validated:** No  
**Core dimensions:** Manage Self / Manage Humans / Manage AI / Manage Human–AI Systems

Intro:

> החלק הבא עוסק באופן שבו את/ה מנהל/ת עבודה בעידן שבו AI הופך לחלק מהעבודה האישית והצוותית.
>
> אין ציפייה שכל מנהל/ת כבר יעבוד/תעבוד עם סוכני AI או עם תהליכים אוטומטיים מתקדמים. חשוב לענות לפי מה שקורה בפועל כיום.
>
> כאשר הדבר רלוונטי לצוות או למשימה, באיזו תדירות את/ה פועל/ת כך?

**Scale 1–5:**
1. אף פעם
2. לעיתים רחוקות
3. לפעמים
4. לעיתים קרובות
5. כמעט תמיד

Additional option: `לא רלוונטי / עדיין לא התנסיתי בכך`

## H1 — Manage Self | ניהול עצמי

### `AM_SELF_01`
> אני מתנסה באופן שוטף בדרכים חדשות שבהן AI יכול לשפר את העבודה שלי.

### `AM_SELF_02`
> אני יודע/ת לזהות גם מצבים שבהם לא נכון להסתמך על AI.

### `AM_SELF_03`
> כאשר AI משפיע על החלטה משמעותית שלי, אני בוחן/ת את ההמלצה ולא מקבל/ת אותה באופן אוטומטי.

### `AM_SELF_04`
> אני משקיע/ה באופן מכוון בלמידה ובהתעדכנות ביכולות AI הרלוונטיות לעבודה שלי.

## H2 — Manage Humans | ניהול אנשים

### `AM_HUMANS_01`
> אני מבהיר/ה לצוות מה אני מצפה מהם בנוגע לשימוש ב-AI.

### `AM_HUMANS_02`
> אני עוזר/ת לעובדים לזהות משימות והזדמנויות שבהן AI יכול לשפר את עבודתם.

### `AM_HUMANS_03`
> אני יוצר/ת סביבה שבה עובדים יכולים להתנסות ב-AI, לשתף הצלחות וגם לדבר על כשלים.

### `AM_HUMANS_04`
> אני מקפיד/ה שהשימוש ב-AI לא יחליף שיקול דעת, שיחה או יחס אנושי במקומות שבהם הם נדרשים.

## H3 — Manage AI | ניהול AI

### `AM_AI_01`
> כשאני מעביר/ה עבודה ל-AI, אני מגדיר/ה מראש את המטרה ואת התוצאה הרצויה.

### `AM_AI_02`
> אני מגדיר/ה מראש את הגבולות, המידע והפעולות שה-AI רשאי להשתמש בהם כחלק מהמשימה.

### `AM_AI_03`
> אני קובע/ת נקודות שבהן נדרשת בדיקה או אישור אנושי לפני שהתהליך מתקדם.

### `AM_AI_04`
> כאשר תוצר של AI אינו עומד בציפיות, אני בוחן/ת האם צריך לשנות את ההנחיה, את התהליך או את גבולות הפעולה — ולא רק לנסות שוב באותה דרך.

## H4 — Manage Human–AI Systems | ניהול מערכות אדם–AI

### `AM_SYSTEMS_01`
> אני בוחן/ת תהליכי עבודה שלמים, ולא רק משימות בודדות, כדי לזהות היכן נכון לשלב AI.

### `AM_SYSTEMS_02`
> בתהליך שמשלב עובדים ו-AI, אני מגדיר/ה בצורה ברורה מי אחראי על כל שלב ועל התוצאה הסופית.

### `AM_SYSTEMS_03`
> אני מגדיר/ה מראש מי מקבל את ההחלטה הסופית כאשר עובד/ת ו-AI מגיעים למסקנות שונות.

### `AM_SYSTEMS_04`
> בתהליך משמעותי שמסתמך על AI, קיימת דרך ברורה להתמודד עם טעות, כשל או מצב חריג.

### `AM_SYSTEMS_05`
> אני בוחן/ת האם שילוב AI יוצר כפילויות, עומס או נקודות חיכוך חדשות בתהליך, ומבצע/ת התאמות בהתאם.

### `AM_SYSTEMS_06`
> אני משתמש/ת בנתונים ובמשוב מהצוות כדי לשפר לאורך זמן את הדרך שבה AI משולב בעבודה.

## Scoring

Calculate four separate dimension means:
- `agentic_manage_self` = 4 items
- `agentic_manage_humans` = 4 items
- `agentic_manage_ai` = 4 items
- `agentic_manage_systems` = 6 items

Do **not** present one universal Agentic Manager score by default.

Exclude `לא רלוונטי / עדיין לא התנסיתי בכך` from numeric calculation.

---

# 12. Section I — מפת חלוקת העבודה אדם–AI

**Section ID:** `SECTION_DELEGATION_MAP`  
**Source type:** NGG diagnostic  
**Audience:** Managers  
**Validated:** No  

Intro:

> עכשיו נרצה להבין כיצד משימות ניהוליות שונות מתבצעות בפועל כיום.
>
> עבור כל פעילות, בחר/י את האפשרות שמתארת בצורה הטובה ביותר את המצב הנוכחי בצוות שלך.

## Response categories

### `HUMAN_LED`
**בעיקר אנושי**  
האדם מבצע כמעט את כל הפעילות. AI אינו מעורב או משמש באופן זניח.

### `AI_ASSISTED`
**AI מסייע**  
האדם מוביל את הפעילות וההחלטה; AI מסייע בחלקים נקודתיים.

### `AI_DELEGATED`
**חלק משמעותי מואצל ל-AI**  
AI מבצע חלק משמעותי מהפעילות או מספר שלבים, והאדם בודק, מאשר או מתערב בנקודות מוגדרות.

### `AI_AUTONOMOUS`
**ברובה אוטומטית**  
הפעילות מתבצעת ברובה באמצעות AI או אוטומציה, עם התערבות אנושית בעיקר במקרים חריגים או בנקודות בקרה.

### `NOT_RELEVANT`
**לא רלוונטי לתפקיד / לצוות שלי**

## Activities

### `DELEGATION_01`
> תזמון וארגון פגישות

### `DELEGATION_02`
> סיכום פגישות, מסמכים ומידע

### `DELEGATION_03`
> כתיבת דוחות, עדכונים ותקשורת שגרתית

### `DELEGATION_04`
> איסוף וניתוח נתונים

### `DELEGATION_05`
> תכנון עבודה ותעדוף משימות

### `DELEGATION_06`
> ניתוח חלופות וסיכונים

### `DELEGATION_07`
> הכנה לקבלת החלטות

### `DELEGATION_08`
> מעקב אחר ביצועים, יעדים או KPI

### `DELEGATION_09`
> הכנה לשיחות משוב ופיתוח עובדים

### `DELEGATION_10`
> תקשורת שגרתית עם לקוחות או בעלי עניין

### `DELEGATION_11`
> למידה ופיתוח מקצועי של הצוות

### `DELEGATION_12`
> תהליכים חוזרים של הצוות שניתנים להגדרה מראש

## `DELEGATION_OPPORTUNITY`

After matrix:

> באילו מהתחומים הבאים לדעתך יש פוטנציאל משמעותי להגדיל את השימוש ב-AI במהלך 12 החודשים הקרובים?

**Type:** Multi-select from the same 12 activities.

Additional options:
- לא מזהה כרגע תחום כזה
- לא בטוח/ה

Do not convert this map into a psychometric maturity score. Use distributions and current-state/opportunity comparisons.

---

# 13. Section J — השפעה, חסמים והזדמנויות

**Section ID:** `SECTION_OUTCOMES_BARRIERS`  
**Source type:** NGG diagnostic  
**Audience:** All; some items routed to AI users  

## `IMPACT_QUALITY_01`

**Display if:** AI user

> בהשוואה לעבודה ללא AI, איזו השפעה יש כיום לשימוש ב-AI על איכות התוצרים שלך?

**Options:**
- פוגע משמעותית באיכות
- פוגע מעט באיכות
- ללא שינוי משמעותי
- משפר מעט את האיכות
- משפר משמעותית את האיכות
- קשה לי להעריך

## `IMPACT_TIME_01`

**Display if:** AI user

> בהשוואה לעבודה ללא AI, איזו השפעה יש כיום לשימוש ב-AI על הזמן שנדרש לך לבצע משימות?

**Options:**
- מגדיל משמעותית את הזמן
- מגדיל מעט את הזמן
- ללא שינוי משמעותי
- מקצר מעט את הזמן
- מקצר משמעותית את הזמן
- קשה לי להעריך

## `IMPACT_EXPANSION_01`

**Display if:** AI user

> באיזו מידה AI מאפשר לך לבצע דברים שלא היית מבצע/ת קודם, או לבצע אותם ברמה שלא הייתה מעשית עבורך קודם?

**Scale 1–5:**
1. בכלל לא
2. במידה מועטה
3. במידה בינונית
4. במידה רבה
5. במידה רבה מאוד

Additional option: `קשה לי להעריך`

## `BARRIER_01`

> מהם החסמים המרכזיים שמונעים ממך להשתמש ב-AI בצורה יעילה יותר בעבודה?

**Type:** Multi-select

**Options:**
- לא ברור לי באילו משימות AI יכול לתת לי ערך
- אין לי מספיק ידע או מיומנות
- אין לי מספיק זמן ללמוד ולהתנסות
- אין לי גישה לכלים המתאימים
- לא ברור לי אילו כלים או שימושים מותרים בארגון
- יש לי חששות בנוגע לפרטיות או אבטחת מידע
- קשה לי לסמוך על איכות התוצרים
- הכלים אינם מחוברים למידע או למערכות שאני צריך/ה
- אין מספיק תמיכה או הכוונה ניהולית
- אני חושש/ת מההשפעה של AI על התפקיד שלי
- AI אינו מתאים לחלק משמעותי מהעבודה שלי
- מגבלות טכניות או ביצועים של הכלים
- אחר
- אין כרגע חסם משמעותי

**Logic:** `אין כרגע חסם משמעותי` should be mutually exclusive.

## `ENABLEMENT_NEED_01`

> מה היה עוזר לך יותר מכל להשתמש ב-AI בצורה אפקטיבית יותר בעבודה?

**Type:** Select up to 3

**Options:**
- גישה לכלי AI טובים או מתאימים יותר
- חיבור טוב יותר לנתונים ולמערכות הארגון
- הדרכה בסיסית
- הדרכה מתקדמת ומעשית
- דוגמאות ו-best practices מתוך הארגון
- זמן ייעודי להתנסות ולמידה
- ליווי אישי או AI coach
- מדיניות וכללים ברורים יותר
- תמיכה והכוונה מהמנהל/ת
- תהליכי עבודה ברורים שמשלבים AI
- אחר

---

# 14. Section K — שאלות פתוחות

**Section ID:** `SECTION_OPEN_TEXT`  
**Source type:** NGG qualitative diagnostic  
**Audience:** All  
**Optional:** Yes  

Intro:

> לסיום, נשמח לשמוע ממך במילים שלך. אין חובה לענות על שתי השאלות.

### `OPEN_01`
> אם היית יכול/ה לשנות דבר אחד בדרך שבה AI משולב כיום בעבודה שלך או בצוות שלך — מה היית משנה?

**Type:** Long text  
**Required:** No

### `OPEN_02`
> האם יש משימה או תהליך בעבודה שלך שלדעתך AI יכול לשנות באופן משמעותי, אבל עדיין לא נעשה בו שימוש כזה? אם כן, ספר/י לנו בקצרה.

**Type:** Long text  
**Required:** No

---

# 15. Completion screen

## `COMPLETE_01` — Title

**תודה, סיימנו.**

## `COMPLETE_02` — Body

Default:

> המענה שלך נקלט בהצלחה. התשובות יצטרפו לתמונה הארגונית הכוללת וישמשו להבנת דפוסי השימוש ב-AI, החסמים וההזדמנויות להמשך.

Optional project-specific line:

> תוצאות המדידה יוצגו בהמשך במסגרת [שם התהליך / המפגש / התוכנית].

No personal score should be shown in V1 unless a separate opt-in personal feedback feature is intentionally developed.

---

# 16. Routing summary

```text
START
  ↓
Context
  ↓
AI Usage
  ├── Non-user
  │     ├── GAIL
  │     ├── Organizational Enablement
  │     ├── Manager Experience (if applicable)
  │     ├── Agentic Management (if manager; N/A available)
  │     ├── Delegation Map (if manager; optional)
  │     ├── Barriers / Needs
  │     └── Open Text
  │
  └── AI user
        ├── GAIL
        ├── Agentic Work
        ├── S-TIAS
        ├── Verification Behavior
        ├── Organizational Enablement
        ├── Manager Experience (if applicable)
        ├── Agentic Management (if manager)
        ├── Delegation Map (if manager)
        ├── Impact / Barriers / Needs
        └── Open Text
```

Note: GAIL may be shown to non-users because it measures perceived literacy/capability, not only recent usage. If pilot testing shows excessive confusion among zero-use respondents, reassess this routing empirically rather than silently changing the scale.

---

# 17. Core longitudinal lock

For T0/T1/T2 comparison, the default locked core should include:

- `USE_01`
- `USE_04` through `USE_07`
- all `GAIL_*`
- all `AW_*` where applicable
- all `STIAS_*` where applicable
- all `VERIFY_*`
- all `ORG_*`
- all `MEXP_*`
- all `AM_*` for managers
- `IMPACT_QUALITY_01`
- `IMPACT_TIME_01`
- `IMPACT_EXPANSION_01`

Question IDs must remain stable across waves.

If wording, answer scale, construct association, or routing changes materially, create a new question version and flag comparability.

---

# 18. Dashboard metric mapping

| Dashboard metric | Source items | Default interpretation |
|---|---|---|
| AI Usage Frequency | `USE_01` | Behavioral frequency |
| Use Case Breadth | `USE_04` | Count/distribution, not psychometric |
| AI Literacy | `GAIL_*` | Source-scale total + five dimensions |
| Agentic Work | `AW_*` | NGG behavioral profile |
| Trust in AI | `STIAS_*` | Mean of 3, contextualized by verification |
| Verification | `VERIFY_*` | NGG behavioral mean/profile |
| Organizational Enablement | `ORG_*` | Five dimensions + optional summary mean |
| Manager Experience | `MEXP_*` | Team perception / manager enablement |
| Manage Self | `AM_SELF_*` | NGG manager dimension |
| Manage Humans | `AM_HUMANS_*` | NGG manager dimension |
| Manage AI | `AM_AI_*` | NGG manager dimension |
| Manage Human–AI Systems | `AM_SYSTEMS_*` | NGG manager dimension |
| Delegation Map | `DELEGATION_*` | Distribution, not psychometric score |
| Impact — Quality | `IMPACT_QUALITY_01` | Outcome perception |
| Impact — Time | `IMPACT_TIME_01` | Outcome perception |
| Impact — Expansion | `IMPACT_EXPANSION_01` | Augmentation / new capability |

---

# 19. Manager–Team Gap mapping

Do not compare unrelated items simply because they appear similar.

Recommended pairs:

| Manager self-report | Team experience | Interpretation |
|---|---|---|
| `AM_HUMANS_01` | `MEXP_01` | Clarity of expectations |
| `AM_HUMANS_02` | `MEXP_02` | Opportunity identification |
| `AM_HUMANS_03` | `MEXP_03` | Experimentation climate |
| `AM_SYSTEMS_02` | `MEXP_04` | Responsibility clarity |
| `AM_HUMANS_04` | `MEXP_06` | Protection of human judgment/interaction |

`MEXP_05` may be shown as a team-level indicator of verification culture, but should not be treated as an exact mirror score unless a dedicated manager item is added in a future validated revision.

Gap calculation:

`team mean - manager mean`

Always display both source values alongside the gap.

Do not label a small difference as meaningful without an agreed practical/statistical threshold.

---

# 20. Privacy and response display copy

When a filter produces a group below the privacy threshold:

> **הנתונים בקבוצה זו אינם מוצגים כדי לשמור על פרטיות המשיבים.**

Secondary line:

> ניתן לבחור פילוח רחב יותר כדי להציג את התוצאות.

Default suppression threshold: `n < 7`, configurable only by authorized NGG administrators/project policy.

---

# 21. Methodology labels shown to client users

## Validated source scale

Hebrew label:
> **מבוסס על סולם מחקרי מתוקף**

Tooltip:
> המדד מבוסס על סולם שפורסם ועבר בדיקות פסיכומטריות בגרסת המקור. הגרסה העברית במערכת היא התאמה של NGG וטרם עברה תיקוף עצמאי מלא בעברית.

## NGG research-informed measure

Hebrew label:
> **מדד NGG מבוסס מחקר**

Tooltip:
> המדד פותח על ידי NGG על בסיס הספרות והמסגרת המקצועית של המוצר. הוא משמש לאבחון ולמעקב, אך אינו מוצג כסולם פסיכומטרי מתוקף.

## Client custom

Hebrew label:
> **שאלה מותאמת ללקוח**

Tooltip:
> שאלה שנוספה לצורכי הפרויקט ואינה חלק ממדדי הליבה של המערכת, אלא אם הוגדר אחרת במפורש.

---

# 22. Canonical source wording — for traceability only

This appendix is for implementation QA, methodology, translation review and attribution. It is **not** the respondent-facing Hebrew copy.

## 22.1 GAIL — canonical English source items

Source: Liu, X., Zhang, L., & Wei, X. (2025). *Generative Artificial Intelligence Literacy: Scale Development and Its Effect on Job Performance*. Behavioral Sciences, 15(6), 811. DOI: 10.3390/bs15060811. CC BY 4.0.

### Basic Operational Skills
1. I understand the principles and limitations of the AI I use.
2. I can proficiently utilize the core and collaborative functions of AI tools.
3. I can solve common technical problems encountered when using AI.

### Prompt Engineering Ability
4. I can design effective AI prompts based on task requirements.
5. I can optimize AI prompts by integrating technical terminology and examples.
6. I can continuously refine AI prompts based on generated results and feedback.

### Quality Evaluation Ability
7. I can assess the accuracy and reliability of AI-generated content.
8. I can assess the consistency and coherence of AI-generated content.
9. I can evaluate the logic and completeness of AI-generated content.

### Innovative Application Ability
10. I can identify and capitalize on innovative opportunities in my work through AI.
11. I can generate creative and innovative ideas for my work using AI.
12. I can transform innovative ideas into tangible results using AI.

### Compliance and Ethical Awareness
13. I can avoid ethical risks when using AI.
14. I can ensure the protection of privacy and sensitive data when using AI.
15. I can comply with laws and regulations related to AI usage.
16. I can follow organizational guidelines when using AI.
17. I can adhere to professional ethics when using AI.

Source response scale: 1 = strongly disagree, 7 = strongly agree.

## 22.2 S-TIAS — canonical English source items

Source: McGrath, M. J., Lack, O., Tisch, J., & Duenser, A. (2025). *Measuring trust in artificial intelligence: validation of an established scale and its short form*. Frontiers in Artificial Intelligence, 8, 1582880. DOI: 10.3389/frai.2025.1582880. CC BY.

1. I am confident in the AI assistant.
2. The AI assistant is reliable.
3. I can trust the AI assistant.

Source response scale: 1 = Not at all, 7 = Extremely. Mean the three items for the overall trust score.

---

# 23. Implementation requirements for the Questionnaire Builder

The coding agent should treat this file as the canonical V1 copy source.

For every question store at minimum:

```ts
{
  id: string,
  copyVersion: "questionnaire-copy-he-1.0",
  sectionId: string,
  sourceType: "validated_source" | "ngg_measure" | "client_custom",
  locked: boolean,
  audience: "all" | "ai_users" | "managers" | "has_manager",
  questionType: string,
  responseScaleId?: string,
  metricIds?: string[],
  sourceCitation?: string,
  translationStatus?: "source_language" | "ngg_hebrew_adaptation",
  longitudinalCore: boolean,
  displayLogic?: object
}
```

Validated source items:
- cannot be edited in place;
- cannot have their response scale changed;
- cannot be reordered inside the scale by default;
- may be removed only at module level if project settings allow;
- editing requires `Create custom copy`, which detaches the item from validated scoring.

Any future copy change to an NGG core item must increment its question version rather than overwrite historical waves.

---

# 24. Pilot checklist before calling this Production v1.0

Before deployment to the first external client:

1. Conduct independent back-translation of the 17 GAIL and 3 S-TIAS Hebrew items.
2. Review the Hebrew adaptations with at least one psychometrics/research-methods professional and one workplace-AI subject-matter expert.
3. Run cognitive interviews with 5–10 Hebrew-speaking employees/managers from different role families.
4. Verify that respondents understand "AI", "reliable", "ethical risk", "organizational guidelines", "delegation" and the Human/AI allocation categories consistently.
5. Pilot completion time and dropout by section.
6. Check internal consistency of the Hebrew GAIL dimensions and S-TIAS after sufficient pilot responses.
7. Do not silently change item wording after T0. Any material change requires a new version and comparability flag.

---

# 25. References

Liu, X., Zhang, L., & Wei, X. (2025). Generative Artificial Intelligence Literacy: Scale Development and Its Effect on Job Performance. *Behavioral Sciences, 15*(6), 811. https://doi.org/10.3390/bs15060811

McGrath, M. J., Lack, O., Tisch, J., & Duenser, A. (2025). Measuring trust in artificial intelligence: validation of an established scale and its short form. *Frontiers in Artificial Intelligence, 8*, 1582880. https://doi.org/10.3389/frai.2025.1582880

---

**End of Master Questionnaire Copy — v1.0**
