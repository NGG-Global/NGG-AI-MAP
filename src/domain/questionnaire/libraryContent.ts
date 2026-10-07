/**
 * The NGG Section, Question and Metric libraries.
 *
 * Source of truth for all respondent-facing wording, answer scales, routing and scoring associations:
 * docs/questionnaire/NGG_AI_Assessment_Master_Questionnaire_Copy_v1.0.md (copy version
 * `questionnaire-copy-he-1.0`). Hebrew is canonical. English for GAIL and S-TIAS is the published
 * source wording; English for NGG items is a working translation pending NGG approval.
 *
 * Question and section IDs are the IDs defined in the copy and must remain stable across waves.
 */
import type { LocalizedText } from "@/domain/shared/localized";
import type { Audience, QuestionType, ResearchStatus, SectionCategory, SourceType } from "@/domain/shared/enums";
import type { ChoiceOption, DisplayRule, Scale } from "./definition";
import type { QuestionTemplateContent } from "./library";
import type { MetricConfig } from "@/domain/measurement/config";

export const COPY_VERSION = "questionnaire-copy-he-1.0";

export const SOURCE_CITATIONS = {
  gail: "Liu, X., Zhang, L., & Wei, X. (2025). Generative Artificial Intelligence Literacy: Scale Development and Its Effect on Job Performance. Behavioral Sciences, 15(6), 811. https://doi.org/10.3390/bs15060811 (CC BY 4.0)",
  stias: "McGrath, M. J., Lack, O., Tisch, J., & Duenser, A. (2025). Measuring trust in artificial intelligence: validation of an established scale and its short form. Frontiers in Artificial Intelligence, 8, 1582880. https://doi.org/10.3389/frai.2025.1582880 (CC BY)",
} as const;

export { METHODOLOGY_LABELS, HEBREW_ADAPTATION_NOTE } from "./methodology";

/* ------------------------------------------------------ survey frame copy */

export const SURVEY_COPY = {
  title: { he: "איך AI משתלב בעבודה שלנו?", en: "How is AI part of our work?" },
  intro: {
    he: "השאלון נועד להבין כיצד AI משתלב כיום בעבודה שלך ובסביבת העבודה בארגון, מה כבר עובד היטב, היכן קיימים חסמים ואילו הזדמנויות עדיין לא ממומשות.\n\nאין תשובות נכונות או לא נכונות. אנחנו מעוניינים בתמונה אמיתית של המצב כיום — גם אם אינך משתמש/ת ב-AI כלל או שהשימוש שלך עדיין מצומצם.\n\nכאשר אנחנו כותבים AI, הכוונה היא לכלים מבוססי בינה מלאכותית גנרטיבית, כגון ChatGPT, Claude, Gemini, Microsoft Copilot וכלים ארגוניים דומים, וכן לכלים או סוכנים שמסוגלים לבצע מספר שלבים כחלק ממשימה.",
    en: "This questionnaire aims to understand how AI is part of your work and of the work environment in the organization today, what already works well, where there are barriers and which opportunities are not yet realised.\n\nThere are no right or wrong answers. We want a true picture of the current situation — even if you do not use AI at all or your use is still limited.\n\nWhen we write AI, we mean tools based on generative artificial intelligence, such as ChatGPT, Claude, Gemini, Microsoft Copilot and similar organizational tools, as well as tools or agents that can carry out several steps as part of a task.",
  },
  privacyNote: {
    he: "התשובות שלך ישמשו לניתוח ארגוני ולשיפור תהליכי ההטמעה של AI ב-{{org_name}}. התוצאות יוצגו להנהלה באופן מצרפי בלבד, ולא יוצגו תשובות אישיות מזוהות.\n\nקבוצות קטנות מדי לא יוצגו בנפרד, כדי לשמור על פרטיות המשיבים.\n\nמילוי השאלון אורך כ-{{minutes}} דקות.",
    en: "Your answers will be used for organizational analysis and to improve how AI is adopted at {{org_name}}. Results are shown to leadership in aggregate only; individual identifiable answers are never shown.\n\nGroups that are too small are not shown separately, to protect respondents' privacy.\n\nCompleting the questionnaire takes about {{minutes}} minutes.",
  },
  privacyNotePseudonymous: {
    he: "לצורך השוואה לאורך זמן, המערכת עשויה לקשר בין המענה שלך במדידות שונות באמצעות מזהה פנימי שאינו מוצג להנהלת הארגון.",
    en: "For comparison over time, the system may link your answers across measurements using an internal identifier that is not shown to the organization's leadership.",
  },
  startLabel: { he: "מתחילים", en: "Start" },
  completionTitle: { he: "תודה, סיימנו.", en: "Thank you, we're done." },
  completionBody: {
    he: "המענה שלך נקלט בהצלחה. התשובות יצטרפו לתמונה הארגונית הכוללת וישמשו להבנת דפוסי השימוש ב-AI, החסמים וההזדמנויות להמשך.",
    en: "Your response has been recorded. Your answers will join the overall organizational picture and help us understand AI usage patterns, barriers and next opportunities.",
  },
} satisfies Record<string, LocalizedText>;

/* --------------------------------------------------------------- types */

export interface LibraryQuestion {
  canonicalId: string;
  type: QuestionType;
  content: QuestionTemplateContent;
  metricId?: string;
  reverseCoded?: boolean;
  audience?: Audience;
  required?: boolean;
  locked?: boolean;
}

export interface LibrarySection {
  key: string;
  version: string;
  category: SectionCategory;
  name: LocalizedText;
  description: LocalizedText;
  intro?: LocalizedText;
  fallbackIntro?: LocalizedText;
  sourceType: SourceType;
  researchStatus: ResearchStatus;
  audience: Audience;
  recommendedCore?: boolean;
  longitudinalCore?: boolean;
  mandatory?: boolean;
  required?: boolean;
  sourceReference?: string;
  displayRules?: DisplayRule[];
  questions: LibraryQuestion[];
}

/* -------------------------------------------------------------- scales */

const labels = (pairs: Array<[string, string]>): LocalizedText[] => pairs.map(([he, en]) => ({ he, en }));

const AGREE_7: Scale = {
  min: 1,
  max: 7,
  labels: labels([
    ["כלל לא מסכים/ה", "Strongly disagree"],
    ["לא מסכים/ה", "Disagree"],
    ["נוטה לא להסכים", "Somewhat disagree"],
    ["לא מסכים/ה ולא לא מסכים/ה", "Neither agree nor disagree"],
    ["נוטה להסכים", "Somewhat agree"],
    ["מסכים/ה", "Agree"],
    ["מסכים/ה מאוד", "Strongly agree"],
  ]),
};

const EXTENT_7: Scale = {
  min: 1,
  max: 7,
  labels: labels([
    ["בכלל לא", "Not at all"],
    ["במידה מועטה מאוד", "To a very small extent"],
    ["במידה מועטה", "To a small extent"],
    ["במידה בינונית", "To a moderate extent"],
    ["במידה רבה", "To a large extent"],
    ["במידה רבה מאוד", "To a very large extent"],
    ["במידה רבה ביותר", "Extremely"],
  ]),
};

const FREQ_5: Scale = {
  min: 1,
  max: 5,
  labels: labels([
    ["אף פעם", "Never"],
    ["לעיתים רחוקות", "Rarely"],
    ["לפעמים", "Sometimes"],
    ["לעיתים קרובות", "Often"],
    ["כמעט תמיד", "Almost always"],
  ]),
};

const AGREE_5: Scale = {
  min: 1,
  max: 5,
  labels: labels([
    ["כלל לא מסכים/ה", "Strongly disagree"],
    ["לא מסכים/ה", "Disagree"],
    ["לא מסכים/ה ולא לא מסכים/ה", "Neither agree nor disagree"],
    ["מסכים/ה", "Agree"],
    ["מסכים/ה מאוד", "Strongly agree"],
  ]),
};

const EXTENT_5_INTEGRATION: Scale = {
  min: 1,
  max: 5,
  labels: labels([
    ["כמעט בכלל לא", "Almost not at all"],
    ["במידה מועטה", "To a small extent"],
    ["במידה בינונית", "To a moderate extent"],
    ["במידה רבה", "To a large extent"],
    ["במידה רבה מאוד", "To a very large extent"],
  ]),
};

const EXTENT_5_EXPANSION: Scale = {
  min: 1,
  max: 5,
  labels: labels([
    ["בכלל לא", "Not at all"],
    ["במידה מועטה", "To a small extent"],
    ["במידה בינונית", "To a moderate extent"],
    ["במידה רבה", "To a large extent"],
    ["במידה רבה מאוד", "To a very large extent"],
  ]),
};

const ACCESS_5: Scale = {
  min: 1,
  max: 5,
  labels: labels([
    ["אין לי גישה מספקת", "I do not have sufficient access"],
    ["גישה מוגבלת", "Limited access"],
    ["גישה חלקית", "Partial access"],
    ["גישה טובה", "Good access"],
    ["יש לי את הכלים הנדרשים לי", "I have the tools I need"],
  ]),
};

/* -------------------------------------------------------------- helpers */

const AI_USER: DisplayRule[] = [{ field: "q:USE_01", operator: "neq", value: "none" }];
const IS_MANAGER: DisplayRule[] = [{ field: "q:CTX_03", operator: "eq", value: "yes" }];
const HAS_MANAGER: DisplayRule[] = [{ field: "q:MEXP_SCREEN_01", operator: "eq", value: "yes" }];

const opt = (value: string, he: string, en: string, extra: Partial<ChoiceOption> = {}): ChoiceOption => ({ value, label: { he, en }, ...extra });
/** Segment options use the Hebrew label as value so dashboard filters read naturally. */
const segOpt = (he: string, en: string): ChoiceOption => ({ value: he, label: { he, en } });

const YES_NO = [opt("yes", "כן", "Yes"), opt("no", "לא", "No")];

function scaleItem(
  canonicalId: string,
  he: string,
  en: string,
  scale: Scale,
  metricId: string | undefined,
  extra: Partial<QuestionTemplateContent> = {},
  questionExtra: Partial<LibraryQuestion> = {},
): LibraryQuestion {
  return {
    canonicalId,
    type: scale.max === 7 ? "likert_7" : "likert_5",
    content: { text: { he, en }, scale, wordingStatus: "final", allowPreferNotToAnswer: false, ...extra },
    metricId,
    ...questionExtra,
  };
}

function validatedItem(canonicalId: string, he: string, en: string, scale: Scale, metricId: string, citation: string, extra: Partial<QuestionTemplateContent> = {}): LibraryQuestion {
  return scaleItem(canonicalId, he, en, scale, metricId, { translationStatus: "ngg_hebrew_adaptation", sourceCitation: citation, longitudinalCore: true, ...extra }, { locked: true });
}

const NA_WORK: LocalizedText = { he: "לא רלוונטי לעבודה שלי", en: "Not relevant to my work" };
const NA_DONT_KNOW: LocalizedText = { he: "לא יודע/ת", en: "I don't know" };
const NA_MANAGER_EXP: LocalizedText = { he: "לא רלוונטי / לא יכול/ה להעריך", en: "Not relevant / cannot assess" };
const NA_AGENTIC_MGMT: LocalizedText = { he: "לא רלוונטי / עדיין לא התנסיתי בכך", en: "Not relevant / have not tried this yet" };

/* ---------------------------------------------------------- tool options */

const TOOL_OPTIONS: ChoiceOption[] = [
  opt("chatgpt", "ChatGPT", "ChatGPT"),
  opt("claude", "Claude", "Claude"),
  opt("gemini", "Gemini", "Gemini"),
  opt("copilot", "Microsoft Copilot", "Microsoft Copilot"),
  opt("internal", "כלי AI ארגוני פנימי", "Internal organizational AI tool"),
  opt("research", "כלי AI למחקר או חיפוש", "AI tool for research or search"),
  opt("writing", "כלי AI לכתיבה או יצירת תוכן", "AI tool for writing or content creation"),
  opt("data", "כלי AI לניתוח נתונים", "AI tool for data analysis"),
  opt("code", "כלי AI לקוד או פיתוח", "AI tool for code or development"),
  opt("media", "כלי AI ליצירת תמונה, וידאו או אודיו", "AI tool for image, video or audio creation"),
  opt("automation", "כלי אוטומציה או AI שמבצע מספר פעולות ברצף", "Automation tool or AI that performs several actions in sequence"),
  opt("other", "אחר", "Other"),
];

const DELEGATION_ACTIVITIES: Array<[string, string, string]> = [
  ["DELEGATION_01", "תזמון וארגון פגישות", "Scheduling and organizing meetings"],
  ["DELEGATION_02", "סיכום פגישות, מסמכים ומידע", "Summarizing meetings, documents and information"],
  ["DELEGATION_03", "כתיבת דוחות, עדכונים ותקשורת שגרתית", "Writing reports, updates and routine communication"],
  ["DELEGATION_04", "איסוף וניתוח נתונים", "Collecting and analysing data"],
  ["DELEGATION_05", "תכנון עבודה ותעדוף משימות", "Work planning and task prioritisation"],
  ["DELEGATION_06", "ניתוח חלופות וסיכונים", "Analysing alternatives and risks"],
  ["DELEGATION_07", "הכנה לקבלת החלטות", "Preparing for decisions"],
  ["DELEGATION_08", "מעקב אחר ביצועים, יעדים או KPI", "Tracking performance, goals or KPIs"],
  ["DELEGATION_09", "הכנה לשיחות משוב ופיתוח עובדים", "Preparing feedback and development conversations"],
  ["DELEGATION_10", "תקשורת שגרתית עם לקוחות או בעלי עניין", "Routine communication with customers or stakeholders"],
  ["DELEGATION_11", "למידה ופיתוח מקצועי של הצוות", "Team learning and professional development"],
  ["DELEGATION_12", "תהליכים חוזרים של הצוות שניתנים להגדרה מראש", "Recurring team processes that can be defined in advance"],
];

/* ------------------------------------------------------------- sections */

export const LIBRARY_SECTIONS: LibrarySection[] = [
  /* ---- A. Context */
  {
    key: "SECTION_CONTEXT",
    version: "1.0",
    category: "core_context",
    name: { he: "רקע תעסוקתי", en: "Work context" },
    description: { he: "יחידה, משפחת תפקיד, אחריות ניהולית וותק. משמש לפילוח מצרפי ולניתוב.", en: "Unit, role family, managerial responsibility and tenure. Used for aggregate segmentation and routing." },
    intro: { he: "כמה פרטים כלליים שיעזרו לנו להבין את התוצאות ברמת הארגון. המידע יוצג רק בקבוצות גדולות מספיק לשמירה על פרטיות.", en: "A few general details that help us understand the results at organization level. This information is only shown for groups large enough to protect privacy." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    mandatory: true,
    questions: [
      {
        canonicalId: "CTX_01",
        type: "single_choice",
        content: {
          text: { he: "באיזו יחידה או מחלקה עיקרית את/ה עובד/ת?", en: "In which main unit or department do you work?" },
          optionsFrom: "departments",
          extraOptions: [segOpt("אחר / לא מופיע ברשימה", "Other / not listed")],
          segmentKey: "department",
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "CTX_02",
        type: "single_choice",
        content: {
          text: { he: "מה מתאר בצורה הטובה ביותר את סוג התפקיד שלך?", en: "What best describes the type of role you have?" },
          optionsFrom: "roleFamilies",
          options: [
            segOpt("ניהול", "Management"),
            segOpt("מקצועי / מומחה", "Professional / specialist"),
            segOpt("טכנולוגיה / פיתוח / דאטה", "Technology / development / data"),
            segOpt("תפעול / פרויקטים", "Operations / projects"),
            segOpt("מכירות / שיווק / שירות", "Sales / marketing / service"),
            segOpt("משאבי אנוש / למידה ופיתוח", "HR / learning & development"),
            segOpt("כספים / משפטי / רכש", "Finance / legal / procurement"),
            segOpt("אדמיניסטרציה", "Administration"),
            segOpt("אחר", "Other"),
          ],
          segmentKey: "role_family",
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "CTX_03",
        type: "single_choice",
        content: { text: { he: "האם יש לך אחריות ניהולית ישירה על עובדים?", en: "Do you have direct managerial responsibility for employees?" }, options: YES_NO, segmentKey: "is_manager", allowPreferNotToAnswer: false, wordingStatus: "final" },
      },
      {
        canonicalId: "CTX_04",
        type: "single_choice",
        content: {
          text: { he: "כמה עובדים מדווחים אליך ישירות?", en: "How many employees report to you directly?" },
          options: [opt("1_3", "1–3", "1–3"), opt("4_7", "4–7", "4–7"), opt("8_15", "8–15", "8–15"), opt("16_plus", "16 ומעלה", "16 or more")],
          displayRules: IS_MANAGER,
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "CTX_05",
        type: "single_choice",
        content: {
          text: { he: "כמה זמן את/ה עובד/ת בארגון?", en: "How long have you worked at the organization?" },
          optionsFrom: "seniorityGroups",
          options: [segOpt("פחות משנה", "Less than a year"), segOpt("שנה עד 3 שנים", "1 to 3 years"), segOpt("4–7 שנים", "4–7 years"), segOpt("8 שנים ומעלה", "8 years or more")],
          segmentKey: "seniority",
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
    ],
  },

  /* ---- B. AI usage */
  {
    key: "SECTION_AI_USAGE",
    version: "1.0",
    category: "ai_adoption",
    name: { he: "שימוש ב-AI בעבודה", en: "AI use at work" },
    description: { he: "תדירות, כלים, סוגי משימות, שילוב בשגרה, אוטומציה וגישה לכלים.", en: "Frequency, tools, task types, routine integration, automation and tool access." },
    intro: { he: "השאלות הבאות עוסקות במה שקורה בפועל בעבודה שלך כיום.", en: "The following questions are about what actually happens in your work today." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    mandatory: true,
    questions: [
      {
        canonicalId: "USE_01",
        type: "single_choice",
        metricId: "ai_usage_frequency",
        content: {
          text: { he: "באיזו תדירות השתמשת בכלי AI לצורכי העבודה במהלך 30 הימים האחרונים?", en: "How often did you use AI tools for work during the last 30 days?" },
          options: [
            opt("none", "לא השתמשתי כלל", "I did not use any", { score: 1 }),
            opt("lt_weekly", "פחות מפעם בשבוע", "Less than once a week", { score: 2 }),
            opt("days_1_2", "1–2 ימים בשבוע", "1–2 days a week", { score: 3 }),
            opt("days_3_4", "3–4 ימים בשבוע", "3–4 days a week", { score: 4 }),
            opt("almost_daily", "כמעט בכל יום עבודה", "Almost every workday", { score: 5 }),
            opt("several_daily", "מספר פעמים ביום", "Several times a day", { score: 6 }),
          ],
          allowPreferNotToAnswer: false,
          longitudinalCore: true,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "USE_02",
        type: "multi_select",
        content: { text: { he: "באילו סוגי כלי AI השתמשת לצורכי עבודה במהלך 30 הימים האחרונים?", en: "Which types of AI tools did you use for work during the last 30 days?" }, options: TOOL_OPTIONS, displayRules: AI_USER, allowPreferNotToAnswer: false, wordingStatus: "final" },
      },
      {
        canonicalId: "USE_03",
        type: "single_choice",
        content: {
          text: { he: "באיזה כלי AI את/ה משתמש/ת הכי הרבה לצורכי העבודה?", en: "Which AI tool do you use most for work?" },
          options: TOOL_OPTIONS,
          optionsFromAnswer: "USE_02",
          displayRules: [...AI_USER, { field: "q:USE_02", operator: "count_gt", value: 1 }],
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "USE_04",
        type: "multi_select",
        metricId: "use_case_breadth",
        content: {
          text: { he: "באילו סוגי משימות את/ה משתמש/ת ב-AI כיום?", en: "For which types of tasks do you use AI today?" },
          options: [
            opt("writing", "כתיבה ועריכה", "Writing and editing"),
            opt("summaries", "סיכום מסמכים, פגישות או מידע", "Summarizing documents, meetings or information"),
            opt("research", "חיפוש ומחקר", "Search and research"),
            opt("ideation", "סיעור מוחות ופיתוח רעיונות", "Brainstorming and developing ideas"),
            opt("analysis", "ניתוח נתונים או מידע", "Analysing data or information"),
            opt("presentations", "הכנת מצגות או דוחות", "Preparing presentations or reports"),
            opt("decisions", "ניתוח חלופות ותמיכה בקבלת החלטות", "Analysing alternatives and decision support"),
            opt("planning", "תכנון עבודה, משימות או פרויקטים", "Planning work, tasks or projects"),
            opt("communication", "תקשורת עם עובדים, לקוחות או בעלי עניין", "Communication with employees, customers or stakeholders"),
            opt("code", "קוד, פיתוח או משימות טכניות", "Code, development or technical tasks"),
            opt("automation", "אוטומציה של תהליך עבודה", "Automating a work process"),
            opt("learning", "למידה והתפתחות מקצועית", "Learning and professional development"),
            opt("media", "יצירת תמונה, וידאו או אודיו", "Creating image, video or audio"),
            opt("other", "אחר", "Other"),
          ],
          displayRules: AI_USER,
          allowPreferNotToAnswer: false,
          longitudinalCore: true,
          wordingStatus: "final",
        },
      },
      scaleItem("USE_05", "באיזו מידה AI כבר הפך לחלק קבוע מהדרך שבה את/ה מבצע/ת את העבודה שלך?", "To what extent has AI already become a regular part of how you do your work?", EXTENT_5_INTEGRATION, "ai_work_integration", { displayRules: AI_USER, longitudinalCore: true }),
      {
        canonicalId: "USE_06",
        type: "single_choice",
        content: {
          text: { he: "האם יש כיום משימות חוזרות בעבודה שלך שבהן AI מבצע חלק מהעבודה באופן אוטומטי או כמעט אוטומטי?", en: "Are there recurring tasks in your work today in which AI performs part of the work automatically or almost automatically?" },
          options: [
            opt("no", "לא", "No"),
            opt("one", "כן, במשימה חוזרת אחת", "Yes, in one recurring task"),
            opt("several", "כן, בכמה משימות חוזרות", "Yes, in several recurring tasks"),
            opt("significant", "כן, בחלק משמעותי מתהליך העבודה שלי", "Yes, in a significant part of my work process"),
            opt("unsure", "לא בטוח/ה", "Not sure"),
          ],
          displayRules: AI_USER,
          allowPreferNotToAnswer: false,
          longitudinalCore: true,
          wordingStatus: "final",
        },
      },
      scaleItem("USE_07", "באיזו מידה יש לך גישה לכלי ה-AI הנדרשים לך כדי לבצע את עבודתך בצורה יעילה?", "To what extent do you have access to the AI tools you need to do your work effectively?", ACCESS_5, "tool_access", { naOption: { he: "לא רלוונטי לתפקיד שלי", en: "Not relevant to my role" }, longitudinalCore: true }),
    ],
  },

  /* ---- C. GAIL */
  {
    key: "SECTION_GAIL_17",
    version: "1.0",
    category: "validated_measures",
    name: { he: "אוריינות AI גנרטיבית (GAIL)", en: "Generative AI Literacy (GAIL)" },
    description: { he: "סולם מקור מתוקף, 17 פריטים, 7 דרגות. ניסוח, סדר, סקאלה וחישוב נעולים. הגרסה העברית היא התאמה של NGG.", en: "Validated source scale, 17 items, 7 points. Wording, order, scale and scoring are locked. The Hebrew version is an NGG adaptation." },
    intro: {
      he: "השאלות הבאות עוסקות בידע וביכולת שלך לעבוד עם AI גנרטיבי. גם אם הניסיון שלך מוגבל, חשוב לענות לפי התחושה שלך כיום.\n\nעד כמה את/ה מסכים/ה עם כל אחד מהמשפטים הבאים?",
      en: "The following questions are about your knowledge and ability to work with generative AI. Even if your experience is limited, please answer according to how you feel today.\n\nTo what extent do you agree with each of the following statements?",
    },
    sourceType: "validated",
    researchStatus: "validated",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    sourceReference: SOURCE_CITATIONS.gail,
    questions: [
      validatedItem("GAIL_BOS_01", "אני מבין/ה את העקרונות והמגבלות של כלי ה-AI שבהם אני משתמש/ת.", "I understand the principles and limitations of the AI I use.", AGREE_7, "gail_basic_operation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_BOS_02", "אני יודע/ת להשתמש היטב בפונקציות המרכזיות וביכולות השיתופיות של כלי AI.", "I can proficiently utilize the core and collaborative functions of AI tools.", AGREE_7, "gail_basic_operation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_BOS_03", "אני מסוגל/ת לפתור בעיות טכניות נפוצות שעולות במהלך השימוש ב-AI.", "I can solve common technical problems encountered when using AI.", AGREE_7, "gail_basic_operation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_PE_01", "אני מסוגל/ת לנסח הנחיות אפקטיביות ל-AI בהתאם לדרישות המשימה.", "I can design effective AI prompts based on task requirements.", AGREE_7, "gail_prompt_engineering", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_PE_02", "אני מסוגל/ת לשפר הנחיות ל-AI באמצעות שילוב של מונחים מקצועיים ודוגמאות.", "I can optimize AI prompts by integrating technical terminology and examples.", AGREE_7, "gail_prompt_engineering", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_PE_03", "אני מסוגל/ת לשפר את ההנחיות שלי ל-AI באופן מתמשך בהתאם לתוצרים ולמשוב שאני מקבל/ת.", "I can continuously refine AI prompts based on generated results and feedback.", AGREE_7, "gail_prompt_engineering", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_QE_01", "אני מסוגל/ת להעריך את הדיוק והאמינות של תוכן שנוצר באמצעות AI.", "I can assess the accuracy and reliability of AI-generated content.", AGREE_7, "gail_quality_evaluation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_QE_02", "אני מסוגל/ת להעריך את העקביות והקוהרנטיות של תוכן שנוצר באמצעות AI.", "I can assess the consistency and coherence of AI-generated content.", AGREE_7, "gail_quality_evaluation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_QE_03", "אני מסוגל/ת להעריך את ההיגיון והשלמות של תוכן שנוצר באמצעות AI.", "I can evaluate the logic and completeness of AI-generated content.", AGREE_7, "gail_quality_evaluation", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_IA_01", "אני מסוגל/ת לזהות ולנצל הזדמנויות חדשות בעבודה שלי באמצעות AI.", "I can identify and capitalize on innovative opportunities in my work through AI.", AGREE_7, "gail_innovative_application", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_IA_02", "אני מסוגל/ת להשתמש ב-AI כדי לפתח רעיונות יצירתיים וחדשניים בעבודה שלי.", "I can generate creative and innovative ideas for my work using AI.", AGREE_7, "gail_innovative_application", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_IA_03", "אני מסוגל/ת להפוך רעיונות חדשניים לתוצרים מעשיים באמצעות AI.", "I can transform innovative ideas into tangible results using AI.", AGREE_7, "gail_innovative_application", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_EC_01", "אני מסוגל/ת להימנע מסיכונים אתיים בעת שימוש ב-AI.", "I can avoid ethical risks when using AI.", AGREE_7, "gail_ethics_compliance", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_EC_02", "אני מסוגל/ת להגן על פרטיות ועל מידע רגיש בעת שימוש ב-AI.", "I can ensure the protection of privacy and sensitive data when using AI.", AGREE_7, "gail_ethics_compliance", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_EC_03", "אני מסוגל/ת לפעול בהתאם לחוקים ולרגולציה הרלוונטיים לשימוש ב-AI.", "I can comply with laws and regulations related to AI usage.", AGREE_7, "gail_ethics_compliance", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_EC_04", "אני מסוגל/ת לפעול בהתאם להנחיות הארגון בנוגע לשימוש ב-AI.", "I can follow organizational guidelines when using AI.", AGREE_7, "gail_ethics_compliance", SOURCE_CITATIONS.gail),
      validatedItem("GAIL_EC_05", "אני מסוגל/ת להשתמש ב-AI בהתאם לכללי האתיקה והסטנדרטים המקצועיים הרלוונטיים לתפקיד שלי.", "I can adhere to professional ethics when using AI.", AGREE_7, "gail_ethics_compliance", SOURCE_CITATIONS.gail),
    ],
  },

  /* ---- D. Agentic work */
  {
    key: "SECTION_AGENTIC_WORK",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "עומק העבודה עם AI", en: "Agentic work" },
    description: { he: "מדד ניסיוני של NGG: סיוע, שיתוף, האצלה ותזמור. אינו מדרג בשלות.", en: "Experimental NGG measure: assist, collaborate, delegate, orchestrate. Not a maturity ranking." },
    intro: {
      he: "השאלות הבאות עוסקות בעומק העבודה שלך עם AI — משימוש נקודתי ועד שילוב שלו בתהליכי עבודה מורכבים יותר.\n\nכאשר הדבר רלוונטי למשימה שלך, באיזו תדירות את/ה פועל/ת כך?",
      en: "The following questions are about the depth of your work with AI — from occasional use to integrating it into more complex work processes.\n\nWhen relevant to your task, how often do you act this way?",
    },
    sourceType: "ngg_measure",
    researchStatus: "experimental",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: AI_USER,
    questions: [
      scaleItem("AW_ASSIST_01", "אני משתמש/ת ב-AI כדי ליצור טיוטה, לסכם מידע או לקבל נקודת פתיחה למשימה.", "I use AI to create a draft, summarize information or get a starting point for a task.", FREQ_5, "aw_assist", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_COLLAB_01", "אני עובד/ת עם ה-AI במספר סבבים ומשפר/ת את התוצר יחד איתו.", "I work with AI over several rounds and improve the output together with it.", FREQ_5, "aw_collaborate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_COLLAB_02", "אני מספק/ת ל-AI הקשר, דוגמאות, מגבלות או קריטריונים כדי לשפר את התוצאה.", "I give AI context, examples, constraints or criteria to improve the result.", FREQ_5, "aw_collaborate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_DELEGATE_01", "אני מעביר/ה ל-AI משימות שכוללות כמה שלבים, ולא רק בקשה בודדת.", "I hand AI tasks that involve several steps, not just a single request.", FREQ_5, "aw_delegate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_DELEGATE_02", "לפני שאני מעביר/ה משימה מורכבת ל-AI, אני מגדיר/ה מראש מה ייחשב תוצר מוצלח.", "Before handing a complex task to AI, I define in advance what will count as a successful output.", FREQ_5, "aw_delegate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_ORCH_01", "אני משלב/ת AI כחלק מתהליך עבודה קבוע שחוזר על עצמו.", "I integrate AI as part of a regular, recurring work process.", FREQ_5, "aw_orchestrate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_ORCH_02", "אני מאפשר/ת ל-AI להשתמש בכמה מקורות מידע, כלים או מערכות כחלק מביצוע משימה.", "I allow AI to use several information sources, tools or systems as part of carrying out a task.", FREQ_5, "aw_orchestrate", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("AW_ORCH_03", "בתהליכים מתקדמים, אני מגדיר/ה מראש באילו שלבים ה-AI יכול להתקדם באופן עצמאי ובאילו שלבים נדרשת התערבות אנושית.", "In advanced processes, I define in advance at which steps AI may proceed independently and at which steps human intervention is required.", FREQ_5, "aw_orchestrate", { naOption: NA_WORK, longitudinalCore: true }),
    ],
  },

  /* ---- E1. S-TIAS */
  {
    key: "SECTION_STIAS_3",
    version: "1.0",
    category: "validated_measures",
    name: { he: "אמון בכלי ה-AI (S-TIAS)", en: "Trust in the AI tool (S-TIAS)" },
    description: { he: "סולם מקור מתוקף, 3 פריטים, 7 דרגות, מתייחס לכלי ה-AI העיקרי של המשיב/ה. אמון גבוה אינו בהכרח טוב יותר.", en: "Validated source scale, 3 items, 7 points, about the respondent's main AI tool. Higher trust is not automatically better." },
    intro: {
      he: "בשלוש השאלות הבאות, חשוב/י על כלי ה-AI שבו את/ה משתמש/ת הכי הרבה לצורכי העבודה: {{primary_ai_tool}}.\n\nבאיזו מידה כל אחד מהמשפטים הבאים מתאר את התחושה שלך כלפי הכלי הזה?",
      en: "For the next three questions, think about the AI tool you use most for work: {{primary_ai_tool}}.\n\nTo what extent does each statement describe how you feel about this tool?",
    },
    fallbackIntro: {
      he: "בשלוש השאלות הבאות, חשוב/י על כלי ה-AI שבו את/ה משתמש/ת הכי הרבה לצורכי העבודה.\n\nבאיזו מידה כל אחד מהמשפטים הבאים מתאר את התחושה שלך כלפי הכלי הזה?",
      en: "For the next three questions, think about the AI tool you use most for work.\n\nTo what extent does each statement describe how you feel about this tool?",
    },
    sourceType: "validated",
    researchStatus: "validated",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: AI_USER,
    sourceReference: SOURCE_CITATIONS.stias,
    questions: [
      validatedItem("STIAS_01", "יש לי ביטחון ב-{{primary_ai_tool}}.", "I am confident in {{primary_ai_tool}}.", EXTENT_7, "stias_trust", SOURCE_CITATIONS.stias, { fallbackText: { he: "יש לי ביטחון בכלי ה-AI העיקרי שבו אני משתמש/ת.", en: "I am confident in the AI tool I use most." } }),
      validatedItem("STIAS_02", "{{primary_ai_tool}} הוא כלי אמין.", "{{primary_ai_tool}} is reliable.", EXTENT_7, "stias_trust", SOURCE_CITATIONS.stias, { fallbackText: { he: "כלי ה-AI העיקרי שבו אני משתמש/ת הוא אמין.", en: "The AI tool I use most is reliable." } }),
      validatedItem("STIAS_03", "אני יכול/ה לסמוך על {{primary_ai_tool}}.", "I can trust {{primary_ai_tool}}.", EXTENT_7, "stias_trust", SOURCE_CITATIONS.stias, { fallbackText: { he: "אני יכול/ה לסמוך על כלי ה-AI העיקרי שבו אני משתמש/ת.", en: "I can trust the AI tool I use most." } }),
    ],
  },

  /* ---- E2. Verification */
  {
    key: "SECTION_VERIFICATION",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "בקרה על תוצרי AI", en: "Verification behavior" },
    description: { he: "מדד NGG: בדיקת עובדות, הימנעות מהסתמכות על מידע לא מאומת והתאמת רמת הבדיקה לסיכון.", en: "NGG measure: fact checking, not treating unverified output as certain, scaling checks to risk." },
    intro: { he: "כאשר את/ה משתמש/ת בתוצר של AI לצורך עבודה משמעותית, באיזו תדירות את/ה עושה את הדברים הבאים?", en: "When you use an AI output for significant work, how often do you do the following?" },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: AI_USER,
    questions: [
      scaleItem("VERIFY_01", "אני בודק/ת אם העובדות או הנתונים המרכזיים בתוצר נכונים לפני שאני מסתמך/ת עליו.", "I check whether the key facts or figures in the output are correct before I rely on it.", FREQ_5, "verification_behavior", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("VERIFY_02", "כאשר איני יכול/ה לאמת מידע משמעותי שה-AI מספק, אני נמנע/ת מלהתייחס אליו כאילו הוא ודאי.", "When I cannot verify significant information AI provides, I avoid treating it as certain.", FREQ_5, "verification_behavior", { naOption: NA_WORK, longitudinalCore: true }),
      scaleItem("VERIFY_03", "אני מתאים/ה את רמת הבדיקה שאני מבצע/ת לרמת הסיכון או החשיבות של המשימה.", "I adjust how thoroughly I check to the risk or importance of the task.", FREQ_5, "verification_behavior", { naOption: NA_WORK, longitudinalCore: true }),
    ],
  },

  /* ---- F. Organizational enablement */
  {
    key: "SECTION_ORG_ENABLEMENT",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "סביבת העבודה והטמעת AI בארגון", en: "Organizational AI enablement" },
    description: { he: "מדד NGG בחמישה ממדים: גישה ומשאבים, מדיניות, למידה, תרבות ואסטרטגיה.", en: "NGG measure in five dimensions: access, policy, learning, culture and strategy." },
    intro: {
      he: "השאלות הבאות עוסקות בתנאים שהארגון מספק לשימוש יעיל ואחראי ב-AI.\n\nעד כמה את/ה מסכים/ה עם כל אחד מהמשפטים הבאים?",
      en: "The following questions are about the conditions the organization provides for effective and responsible use of AI.\n\nTo what extent do you agree with each of the following statements?",
    },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    questions: [
      scaleItem("ORG_ACCESS_01", "יש לי גישה לכלי AI מאושרים שמתאימים לצורכי העבודה שלי.", "I have access to approved AI tools that suit my work needs.", AGREE_5, "enablement_access_resources", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_ACCESS_02", "ניתן לשלב את כלי ה-AI בצורה יעילה עם המידע, המערכות או התהליכים שאני צריך/ה בעבודה.", "AI tools can be effectively combined with the information, systems or processes I need at work.", AGREE_5, "enablement_access_resources", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_POLICY_01", "ברור לי איזה מידע מותר ואסור להזין לכלי AI במסגרת העבודה.", "It is clear to me which information may and may not be entered into AI tools at work.", AGREE_5, "enablement_policy_governance", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_POLICY_02", "ברור לי באילו מצבים ניתן להסתמך על AI ובאילו מצבים נדרשת מעורבות או בדיקה אנושית.", "It is clear to me when AI can be relied on and when human involvement or review is required.", AGREE_5, "enablement_policy_governance", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_LEARN_01", "הארגון מספק לי הזדמנויות מספקות ללמוד כיצד להשתמש ב-AI בעבודה.", "The organization gives me sufficient opportunities to learn how to use AI at work.", AGREE_5, "enablement_knowledge_learning", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_LEARN_02", "כשאני זקוק/ה לעזרה בשימוש ב-AI, ברור לי למי או לאן ניתן לפנות.", "When I need help using AI, it is clear to me whom or where to turn to.", AGREE_5, "enablement_knowledge_learning", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_CULTURE_01", "אני מרגיש/ה בטוח/ה להתנסות בדרכים חדשות להשתמש ב-AI בעבודה, גם אם לא כל ניסיון מצליח.", "I feel safe experimenting with new ways to use AI at work, even if not every attempt succeeds.", AGREE_5, "enablement_culture", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_CULTURE_02", "עובדים בארגון משתפים זה עם זה דרכים אפקטיביות להשתמש ב-AI.", "Employees in the organization share effective ways of using AI with each other.", AGREE_5, "enablement_culture", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_STRATEGY_01", "ברור לי כיצד השימוש ב-AI מתחבר למטרות של הארגון או היחידה שלי.", "It is clear to me how AI use connects to the goals of the organization or my unit.", AGREE_5, "enablement_strategy", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
      scaleItem("ORG_STRATEGY_02", "אני רואה מחויבות אמיתית מצד הארגון לשילוב אחראי ומועיל של AI.", "I see real commitment from the organization to responsible and beneficial use of AI.", AGREE_5, "enablement_strategy", { naOption: NA_DONT_KNOW, longitudinalCore: true }),
    ],
  },

  /* ---- G. Manager experience */
  {
    key: "SECTION_MANAGER_EXPERIENCE",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "חוויית הניהול בעידן AI", en: "Manager experience in the AI era" },
    description: { he: "איך הניהול הישיר תומך בעבודה עם AI. מושווה לדיווח העצמי של מנהלים בפריטים מקבילים.", en: "How direct management supports work with AI. Compared with managers' self-report on matching items." },
    intro: { he: "השאלות הבאות עוסקות באופן שבו הניהול הישיר שלך תומך בעבודה עם AI.", en: "The following questions are about how your direct management supports working with AI." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    questions: [
      { canonicalId: "MEXP_SCREEN_01", type: "single_choice", content: { text: { he: "האם יש לך מנהל/ת ישיר/ה שאת/ה עובד/ת מולו/ה באופן שוטף?", en: "Do you have a direct manager you work with on a regular basis?" }, options: YES_NO, allowPreferNotToAnswer: false, wordingStatus: "final" } },
      scaleItem("MEXP_01", "המנהל/ת שלי מבהיר/ה לצוות מה מצופה מאיתנו בנוגע לשימוש ב-AI.", "My manager makes clear to the team what is expected of us regarding AI use.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
      scaleItem("MEXP_02", "המנהל/ת שלי עוזר/ת לנו לזהות משימות והזדמנויות שבהן AI יכול לשפר את העבודה.", "My manager helps us identify tasks and opportunities where AI can improve the work.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
      scaleItem("MEXP_03", "המנהל/ת שלי יוצר/ת סביבה שבה אפשר להתנסות ב-AI, לשתף הצלחות וגם לדבר על כשלים.", "My manager creates an environment where we can experiment with AI, share successes and also talk about failures.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
      scaleItem("MEXP_04", "כאשר AI משולב בתהליך עבודה של הצוות, ברור מי אחראי על כל שלב ועל התוצאה הסופית.", "When AI is part of a team process, it is clear who is responsible for each step and for the final outcome.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
      scaleItem("MEXP_05", "המנהל/ת שלי מעודד/ת אותנו לבדוק, לאתגר ולבקר תוצרים של AI כשצריך.", "My manager encourages us to check, challenge and critique AI outputs when needed.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
      scaleItem("MEXP_06", "המנהל/ת שלי מקפיד/ה שהשימוש ב-AI לא יחליף שיקול דעת, שיחה או יחס אנושי במקומות שבהם הם נדרשים.", "My manager makes sure AI use does not replace judgment, conversation or human care where they are needed.", AGREE_5, "manager_experience", { naOption: NA_MANAGER_EXP, displayRules: HAS_MANAGER, longitudinalCore: true }),
    ],
  },

  /* ---- H. Agentic management */
  {
    key: "SECTION_AGENTIC_MANAGEMENT",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "המנהל בעידן AI", en: "Agentic management" },
    description: { he: "מסגרת NGG ניסיונית בארבעה ממדים נפרדים: ניהול עצמי, ניהול אנשים, ניהול AI וניהול מערכות אדם–AI. למנהלים בלבד.", en: "Experimental NGG framework in four separate dimensions: Manage Self, Humans, AI and Human–AI Systems. Managers only." },
    intro: {
      he: "החלק הבא עוסק באופן שבו את/ה מנהל/ת עבודה בעידן שבו AI הופך לחלק מהעבודה האישית והצוותית.\n\nאין ציפייה שכל מנהל/ת כבר יעבוד/תעבוד עם סוכני AI או עם תהליכים אוטומטיים מתקדמים. חשוב לענות לפי מה שקורה בפועל כיום.\n\nכאשר הדבר רלוונטי לצוות או למשימה, באיזו תדירות את/ה פועל/ת כך?",
      en: "This part is about how you manage work at a time when AI is becoming part of individual and team work.\n\nThere is no expectation that every manager already works with AI agents or advanced automated processes. Please answer according to what actually happens today.\n\nWhen relevant to the team or the task, how often do you act this way?",
    },
    sourceType: "ngg_measure",
    researchStatus: "experimental",
    audience: "managers",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IS_MANAGER,
    questions: [
      scaleItem("AM_SELF_01", "אני מתנסה באופן שוטף בדרכים חדשות שבהן AI יכול לשפר את העבודה שלי.", "I regularly experiment with new ways AI can improve my work.", FREQ_5, "agentic_manage_self", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SELF_02", "אני יודע/ת לזהות גם מצבים שבהם לא נכון להסתמך על AI.", "I can also recognise situations where relying on AI is not appropriate.", FREQ_5, "agentic_manage_self", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SELF_03", "כאשר AI משפיע על החלטה משמעותית שלי, אני בוחן/ת את ההמלצה ולא מקבל/ת אותה באופן אוטומטי.", "When AI influences a significant decision of mine, I examine the recommendation rather than accept it automatically.", FREQ_5, "agentic_manage_self", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SELF_04", "אני משקיע/ה באופן מכוון בלמידה ובהתעדכנות ביכולות AI הרלוונטיות לעבודה שלי.", "I deliberately invest in learning and keeping up to date with AI capabilities relevant to my work.", FREQ_5, "agentic_manage_self", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_HUMANS_01", "אני מבהיר/ה לצוות מה אני מצפה מהם בנוגע לשימוש ב-AI.", "I make clear to my team what I expect of them regarding AI use.", FREQ_5, "agentic_manage_humans", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_HUMANS_02", "אני עוזר/ת לעובדים לזהות משימות והזדמנויות שבהן AI יכול לשפר את עבודתם.", "I help employees identify tasks and opportunities where AI can improve their work.", FREQ_5, "agentic_manage_humans", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_HUMANS_03", "אני יוצר/ת סביבה שבה עובדים יכולים להתנסות ב-AI, לשתף הצלחות וגם לדבר על כשלים.", "I create an environment where employees can experiment with AI, share successes and also talk about failures.", FREQ_5, "agentic_manage_humans", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_HUMANS_04", "אני מקפיד/ה שהשימוש ב-AI לא יחליף שיקול דעת, שיחה או יחס אנושי במקומות שבהם הם נדרשים.", "I make sure AI use does not replace judgment, conversation or human care where they are needed.", FREQ_5, "agentic_manage_humans", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_AI_01", "כשאני מעביר/ה עבודה ל-AI, אני מגדיר/ה מראש את המטרה ואת התוצאה הרצויה.", "When I hand work to AI, I define the goal and the desired outcome in advance.", FREQ_5, "agentic_manage_ai", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_AI_02", "אני מגדיר/ה מראש את הגבולות, המידע והפעולות שה-AI רשאי להשתמש בהם כחלק מהמשימה.", "I define in advance the boundaries, information and actions AI may use as part of the task.", FREQ_5, "agentic_manage_ai", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_AI_03", "אני קובע/ת נקודות שבהן נדרשת בדיקה או אישור אנושי לפני שהתהליך מתקדם.", "I set points where human review or approval is required before the process continues.", FREQ_5, "agentic_manage_ai", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_AI_04", "כאשר תוצר של AI אינו עומד בציפיות, אני בוחן/ת האם צריך לשנות את ההנחיה, את התהליך או את גבולות הפעולה — ולא רק לנסות שוב באותה דרך.", "When an AI output does not meet expectations, I examine whether to change the instruction, the process or the boundaries — not just try again the same way.", FREQ_5, "agentic_manage_ai", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_01", "אני בוחן/ת תהליכי עבודה שלמים, ולא רק משימות בודדות, כדי לזהות היכן נכון לשלב AI.", "I examine whole work processes, not only single tasks, to identify where AI should be integrated.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_02", "בתהליך שמשלב עובדים ו-AI, אני מגדיר/ה בצורה ברורה מי אחראי על כל שלב ועל התוצאה הסופית.", "In a process combining employees and AI, I clearly define who is responsible for each step and for the final outcome.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_03", "אני מגדיר/ה מראש מי מקבל את ההחלטה הסופית כאשר עובד/ת ו-AI מגיעים למסקנות שונות.", "I define in advance who makes the final decision when an employee and AI reach different conclusions.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_04", "בתהליך משמעותי שמסתמך על AI, קיימת דרך ברורה להתמודד עם טעות, כשל או מצב חריג.", "In a significant process that relies on AI, there is a clear way to handle an error, failure or exception.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_05", "אני בוחן/ת האם שילוב AI יוצר כפילויות, עומס או נקודות חיכוך חדשות בתהליך, ומבצע/ת התאמות בהתאם.", "I examine whether integrating AI creates duplication, workload or new friction in the process, and adjust accordingly.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
      scaleItem("AM_SYSTEMS_06", "אני משתמש/ת בנתונים ובמשוב מהצוות כדי לשפר לאורך זמן את הדרך שבה AI משולב בעבודה.", "I use data and team feedback to improve over time how AI is integrated into the work.", FREQ_5, "agentic_manage_systems", { naOption: NA_AGENTIC_MGMT, longitudinalCore: true }),
    ],
  },

  /* ---- I. Delegation map */
  {
    key: "SECTION_DELEGATION_MAP",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "מפת חלוקת העבודה אדם–AI", en: "Human–AI delegation map" },
    description: { he: "אבחון NGG: איך מתבצעות היום 12 פעילויות ניהוליות, והיכן יש פוטנציאל להגדלת השימוש ב-AI. התפלגות, לא ציון בשלות.", en: "NGG diagnostic: how 12 management activities are done today and where AI use could grow. A distribution, not a maturity score." },
    intro: {
      he: "עכשיו נרצה להבין כיצד משימות ניהוליות שונות מתבצעות בפועל כיום.\n\nעבור כל פעילות, בחר/י את האפשרות שמתארת בצורה הטובה ביותר את המצב הנוכחי בצוות שלך.",
      en: "Now we would like to understand how different management tasks are actually carried out today.\n\nFor each activity, choose the option that best describes the current situation in your team.",
    },
    sourceType: "ngg_measure",
    researchStatus: "experimental",
    audience: "managers",
    displayRules: IS_MANAGER,
    required: false,
    questions: [
      {
        canonicalId: "DELEGATION_MAP",
        type: "matrix",
        required: false,
        content: {
          text: { he: "כיצד מתבצעת כל פעילות בצוות שלך כיום?", en: "How is each activity carried out in your team today?" },
          helpText: {
            he: "בעיקר אנושי — האדם מבצע כמעט את כל הפעילות; AI אינו מעורב או משמש באופן זניח. AI מסייע — האדם מוביל את הפעילות וההחלטה; AI מסייע בחלקים נקודתיים. חלק משמעותי מואצל ל-AI — AI מבצע חלק משמעותי מהפעילות או מספר שלבים, והאדם בודק, מאשר או מתערב בנקודות מוגדרות. ברובה אוטומטית — הפעילות מתבצעת ברובה באמצעות AI או אוטומציה, עם התערבות אנושית בעיקר במקרים חריגים או בנקודות בקרה.",
            en: "Mainly human — the person does almost all of the activity; AI is not involved or only marginally. AI assists — the person leads the activity and decision; AI helps with specific parts. Significant part delegated to AI — AI performs a significant part or several steps, and the person reviews, approves or intervenes at defined points. Mostly automated — the activity is carried out mostly by AI or automation, with human intervention mainly in exceptions or at control points.",
          },
          matrixRows: DELEGATION_ACTIVITIES.map(([key, he, en]) => ({ key, label: { he, en } })),
          matrixColumns: [
            opt("human_led", "בעיקר אנושי", "Mainly human"),
            opt("ai_assisted", "AI מסייע", "AI assists"),
            opt("ai_delegated", "חלק משמעותי מואצל ל-AI", "Significant part delegated to AI"),
            opt("ai_autonomous", "ברובה אוטומטית", "Mostly automated"),
            opt("not_relevant", "לא רלוונטי לתפקיד / לצוות שלי", "Not relevant to my role / team"),
          ],
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "DELEGATION_OPPORTUNITY",
        type: "multi_select",
        required: false,
        content: {
          text: { he: "באילו מהתחומים הבאים לדעתך יש פוטנציאל משמעותי להגדיל את השימוש ב-AI במהלך 12 החודשים הקרובים?", en: "In which of these areas do you think there is significant potential to increase AI use over the next 12 months?" },
          options: [
            ...DELEGATION_ACTIVITIES.map(([key, he, en]) => opt(key, he, en)),
            opt("none_identified", "לא מזהה כרגע תחום כזה", "I do not currently see such an area", { exclusive: true }),
            opt("unsure", "לא בטוח/ה", "Not sure", { exclusive: true }),
          ],
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
    ],
  },

  /* ---- J. Outcomes and barriers */
  {
    key: "SECTION_OUTCOMES_BARRIERS",
    version: "1.0",
    category: "outcomes",
    name: { he: "השפעה, חסמים והזדמנויות", en: "Impact, barriers and needs" },
    description: { he: "השפעה נתפסת על איכות, זמן והרחבת יכולות; חסמים מרכזיים ומה היה עוזר.", en: "Perceived impact on quality, time and capability; main barriers and what would help." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    questions: [
      {
        canonicalId: "IMPACT_QUALITY_01",
        type: "single_choice",
        metricId: "impact_quality",
        content: {
          text: { he: "בהשוואה לעבודה ללא AI, איזו השפעה יש כיום לשימוש ב-AI על איכות התוצרים שלך?", en: "Compared with working without AI, what effect does AI use currently have on the quality of your outputs?" },
          options: [
            opt("harms_significantly", "פוגע משמעותית באיכות", "Significantly harms quality", { score: 1 }),
            opt("harms_slightly", "פוגע מעט באיכות", "Slightly harms quality", { score: 2 }),
            opt("no_change", "ללא שינוי משמעותי", "No significant change", { score: 3 }),
            opt("improves_slightly", "משפר מעט את האיכות", "Slightly improves quality", { score: 4 }),
            opt("improves_significantly", "משפר משמעותית את האיכות", "Significantly improves quality", { score: 5 }),
            opt("hard_to_assess", "קשה לי להעריך", "Hard for me to assess"),
          ],
          displayRules: AI_USER,
          allowPreferNotToAnswer: false,
          longitudinalCore: true,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "IMPACT_TIME_01",
        type: "single_choice",
        metricId: "impact_time",
        content: {
          text: { he: "בהשוואה לעבודה ללא AI, איזו השפעה יש כיום לשימוש ב-AI על הזמן שנדרש לך לבצע משימות?", en: "Compared with working without AI, what effect does AI use currently have on the time you need to complete tasks?" },
          options: [
            opt("increases_significantly", "מגדיל משמעותית את הזמן", "Significantly increases the time", { score: 1 }),
            opt("increases_slightly", "מגדיל מעט את הזמן", "Slightly increases the time", { score: 2 }),
            opt("no_change", "ללא שינוי משמעותי", "No significant change", { score: 3 }),
            opt("reduces_slightly", "מקצר מעט את הזמן", "Slightly reduces the time", { score: 4 }),
            opt("reduces_significantly", "מקצר משמעותית את הזמן", "Significantly reduces the time", { score: 5 }),
            opt("hard_to_assess", "קשה לי להעריך", "Hard for me to assess"),
          ],
          displayRules: AI_USER,
          allowPreferNotToAnswer: false,
          longitudinalCore: true,
          wordingStatus: "final",
        },
      },
      scaleItem("IMPACT_EXPANSION_01", "באיזו מידה AI מאפשר לך לבצע דברים שלא היית מבצע/ת קודם, או לבצע אותם ברמה שלא הייתה מעשית עבורך קודם?", "To what extent does AI enable you to do things you would not have done before, or to do them at a level that was not practical for you before?", EXTENT_5_EXPANSION, "impact_expansion", { naOption: { he: "קשה לי להעריך", en: "Hard for me to assess" }, displayRules: AI_USER, longitudinalCore: true }),
      {
        canonicalId: "BARRIER_01",
        type: "multi_select",
        content: {
          text: { he: "מהם החסמים המרכזיים שמונעים ממך להשתמש ב-AI בצורה יעילה יותר בעבודה?", en: "What are the main barriers preventing you from using AI more effectively at work?" },
          options: [
            opt("unclear_value", "לא ברור לי באילו משימות AI יכול לתת לי ערך", "It is unclear to me in which tasks AI can add value"),
            opt("skills", "אין לי מספיק ידע או מיומנות", "I lack sufficient knowledge or skill"),
            opt("time", "אין לי מספיק זמן ללמוד ולהתנסות", "I do not have enough time to learn and experiment"),
            opt("access", "אין לי גישה לכלים המתאימים", "I do not have access to suitable tools"),
            opt("unclear_policy", "לא ברור לי אילו כלים או שימושים מותרים בארגון", "It is unclear which tools or uses are allowed in the organization"),
            opt("privacy", "יש לי חששות בנוגע לפרטיות או אבטחת מידע", "I have privacy or information-security concerns"),
            opt("quality_trust", "קשה לי לסמוך על איכות התוצרים", "I find it hard to trust the quality of the outputs"),
            opt("not_connected", "הכלים אינם מחוברים למידע או למערכות שאני צריך/ה", "The tools are not connected to the information or systems I need"),
            opt("management_support", "אין מספיק תמיכה או הכוונה ניהולית", "There is not enough management support or guidance"),
            opt("role_concern", "אני חושש/ת מההשפעה של AI על התפקיד שלי", "I am concerned about the impact of AI on my role"),
            opt("not_suitable", "AI אינו מתאים לחלק משמעותי מהעבודה שלי", "AI does not suit a significant part of my work"),
            opt("technical", "מגבלות טכניות או ביצועים של הכלים", "Technical limitations or tool performance"),
            opt("other", "אחר", "Other"),
            opt("no_barrier", "אין כרגע חסם משמעותי", "There is currently no significant barrier", { exclusive: true }),
          ],
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
      {
        canonicalId: "ENABLEMENT_NEED_01",
        type: "multi_select",
        content: {
          text: { he: "מה היה עוזר לך יותר מכל להשתמש ב-AI בצורה אפקטיבית יותר בעבודה?", en: "What would help you most to use AI more effectively at work?" },
          options: [
            opt("better_tools", "גישה לכלי AI טובים או מתאימים יותר", "Access to better or more suitable AI tools"),
            opt("data_integration", "חיבור טוב יותר לנתונים ולמערכות הארגון", "Better connection to organizational data and systems"),
            opt("basic_training", "הדרכה בסיסית", "Basic training"),
            opt("advanced_training", "הדרכה מתקדמת ומעשית", "Advanced, practical training"),
            opt("internal_examples", "דוגמאות ו-best practices מתוך הארגון", "Examples and best practices from within the organization"),
            opt("dedicated_time", "זמן ייעודי להתנסות ולמידה", "Dedicated time to experiment and learn"),
            opt("coaching", "ליווי אישי או AI coach", "Personal guidance or an AI coach"),
            opt("clear_policy", "מדיניות וכללים ברורים יותר", "Clearer policy and rules"),
            opt("manager_support", "תמיכה והכוונה מהמנהל/ת", "Support and guidance from my manager"),
            opt("defined_processes", "תהליכי עבודה ברורים שמשלבים AI", "Clear work processes that integrate AI"),
            opt("other", "אחר", "Other"),
          ],
          maxSelections: 3,
          allowPreferNotToAnswer: false,
          wordingStatus: "final",
        },
      },
    ],
  },

  /* ---- K. Open text */
  {
    key: "SECTION_OPEN_TEXT",
    version: "1.0",
    category: "qualitative",
    name: { he: "שאלות פתוחות", en: "Open questions" },
    description: { he: "תשובות חופשיות, לא חובה. מנותחות תמטית לאחר הסרת פרטים מזהים.", en: "Optional free text. Analysed thematically after removing identifying details." },
    intro: { he: "לסיום, נשמח לשמוע ממך במילים שלך. אין חובה לענות על שתי השאלות.", en: "Finally, we would like to hear from you in your own words. Answering is optional." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    required: false,
    questions: [
      { canonicalId: "OPEN_01", type: "long_text", required: false, content: { text: { he: "אם היית יכול/ה לשנות דבר אחד בדרך שבה AI משולב כיום בעבודה שלך או בצוות שלך — מה היית משנה?", en: "If you could change one thing about how AI is integrated into your work or your team today — what would it be?" }, allowPreferNotToAnswer: false, wordingStatus: "final" } },
      { canonicalId: "OPEN_02", type: "long_text", required: false, content: { text: { he: "האם יש משימה או תהליך בעבודה שלך שלדעתך AI יכול לשנות באופן משמעותי, אבל עדיין לא נעשה בו שימוש כזה? אם כן, ספר/י לנו בקצרה.", en: "Is there a task or process in your work that you think AI could significantly change, but where it is not yet used that way? If so, tell us briefly." }, allowPreferNotToAnswer: false, wordingStatus: "final" } },
    ],
  },

  /* ---- Client custom */
  {
    key: "SECTION_CLIENT_CUSTOM",
    version: "1.0",
    category: "custom",
    name: { he: "שאלות לקוח", en: "Client questions" },
    description: { he: "שאלות ייעודיות לפרויקט. לא נכללות במדדי הליבה.", en: "Project-specific questions. Not part of the core metrics." },
    sourceType: "client_custom",
    researchStatus: "custom",
    audience: "all",
    questions: [],
  },
];

/* --------------------------------------------------------- metric library */

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
const GAIL_BOS = range("GAIL_BOS_", 3);
const GAIL_PE = range("GAIL_PE_", 3);
const GAIL_QE = range("GAIL_QE_", 3);
const GAIL_IA = range("GAIL_IA_", 3);
const GAIL_EC = range("GAIL_EC_", 5);
const AW_ASSIST = ["AW_ASSIST_01"];
const AW_COLLAB = range("AW_COLLAB_", 2);
const AW_DELEGATE = range("AW_DELEGATE_", 2);
const AW_ORCH = range("AW_ORCH_", 3);

type MetricInput = Omit<MetricConfig, "reverseCodedIds" | "minAnsweredRatio" | "coreProfile" | "audience" | "neutralDirection"> & Partial<Pick<MetricConfig, "reverseCodedIds" | "minAnsweredRatio" | "coreProfile" | "audience" | "neutralDirection">>;
const m = (input: MetricInput): MetricConfig => ({ reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all", neutralDirection: false, ...input });
const scaleMetric = (id: string, he: string, en: string, items: string[], extra: Partial<MetricConfig> & { group: MetricConfig["group"]; sourceType: MetricConfig["sourceType"] }, scale: [number, number] = [1, 5]) =>
  m({ id, name: { he, en }, kind: "scale_mean", scaleMin: scale[0], scaleMax: scale[1], itemCanonicalIds: items, ...extra });

export const METRIC_DEFINITIONS: MetricConfig[] = [
  // ---- core profile (no single maturity score)
  scaleMetric("ai_usage_frequency", "תדירות שימוש ב-AI", "AI usage frequency", ["USE_01"], { group: "core", sourceType: "ngg_measure", coreProfile: true, description: { he: "תדירות התנהגותית בסקאלה 1–6, מ\"לא השתמשתי כלל\" ועד \"מספר פעמים ביום\".", en: "Behavioral frequency on a 1–6 scale, from \"did not use\" to \"several times a day\"." } }, [1, 6]),
  scaleMetric("gail_total", "אוריינות AI (GAIL)", "AI literacy (GAIL)", [...GAIL_BOS, ...GAIL_PE, ...GAIL_QE, ...GAIL_IA, ...GAIL_EC], { group: "core", sourceType: "validated", coreProfile: true, minAnsweredRatio: 1, description: { he: "ממוצע 17 פריטי GAIL בסקאלה 1–7.", en: "Mean of the 17 GAIL items on a 1–7 scale." } }, [1, 7]),
  scaleMetric("agentic_work", "עבודה אג׳נטית", "Agentic work", [...AW_ASSIST, ...AW_COLLAB, ...AW_DELEGATE, ...AW_ORCH], { group: "core", sourceType: "ngg_measure", coreProfile: true, description: { he: "פרופיל התנהגותי של NGG. אינו מדרג בשלות.", en: "NGG behavioral profile. Not a maturity ranking." } }),
  scaleMetric("verification_behavior", "התנהגות אימות", "Verification behavior", range("VERIFY_", 3), { group: "core", sourceType: "ngg_measure", coreProfile: true }),
  scaleMetric("organizational_ai_enablement", "אפשור ארגוני", "Organizational enablement", ["ORG_ACCESS_01", "ORG_ACCESS_02", "ORG_POLICY_01", "ORG_POLICY_02", "ORG_LEARN_01", "ORG_LEARN_02", "ORG_CULTURE_01", "ORG_CULTURE_02", "ORG_STRATEGY_01", "ORG_STRATEGY_02"], { group: "core", sourceType: "ngg_measure", coreProfile: true, description: { he: "ממוצע מסכם; חמשת הממדים נשארים גלויים.", en: "Summary mean; the five dimensions remain visible." } }),
  // ---- adoption
  m({ id: "ai_daily_use_share", name: { he: "שימוש כמעט יומי", en: "Near-daily use" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["USE_01"], positiveValues: ["almost_daily", "several_daily"], minAnsweredRatio: 1 }),
  m({ id: "ai_nonuser_share", name: { he: "לא השתמשו כלל", en: "Non-users" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["USE_01"], positiveValues: ["none"], minAnsweredRatio: 1, neutralDirection: true }),
  m({ id: "use_case_breadth", name: { he: "רוחב השימושים", en: "Use-case breadth" }, kind: "breadth", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 14, itemCanonicalIds: ["USE_04"], minAnsweredRatio: 1, description: { he: "מספר סוגי משימות ממוצע למשיב. ספירה, לא סולם פסיכומטרי.", en: "Average number of task types per respondent. A count, not a psychometric scale." } }),
  scaleMetric("ai_work_integration", "שילוב בשגרת העבודה", "Integration into routine", ["USE_05"], { group: "adoption", sourceType: "ngg_measure" }),
  scaleMetric("tool_access", "גישה לכלים", "Tool access", ["USE_07"], { group: "adoption", sourceType: "ngg_measure" }),
  // ---- GAIL dimensions
  scaleMetric("gail_basic_operation", "מיומנויות תפעול בסיסיות", "Basic operational skills", GAIL_BOS, { group: "ai_literacy_dimension", parentId: "gail_total", sourceType: "validated", minAnsweredRatio: 1 }, [1, 7]),
  scaleMetric("gail_prompt_engineering", "ניסוח ושיפור הנחיות", "Prompt engineering", GAIL_PE, { group: "ai_literacy_dimension", parentId: "gail_total", sourceType: "validated", minAnsweredRatio: 1 }, [1, 7]),
  scaleMetric("gail_quality_evaluation", "הערכת איכות התוצרים", "Quality evaluation", GAIL_QE, { group: "ai_literacy_dimension", parentId: "gail_total", sourceType: "validated", minAnsweredRatio: 1 }, [1, 7]),
  scaleMetric("gail_innovative_application", "יישום חדשני", "Innovative application", GAIL_IA, { group: "ai_literacy_dimension", parentId: "gail_total", sourceType: "validated", minAnsweredRatio: 1 }, [1, 7]),
  scaleMetric("gail_ethics_compliance", "אתיקה וציות", "Ethics & compliance", GAIL_EC, { group: "ai_literacy_dimension", parentId: "gail_total", sourceType: "validated", minAnsweredRatio: 1 }, [1, 7]),
  // ---- agentic work dimensions and funnel
  scaleMetric("aw_assist", "סיוע", "Assist", AW_ASSIST, { group: "agentic_work_dimension", parentId: "agentic_work", sourceType: "ngg_measure" }),
  scaleMetric("aw_collaborate", "שיתוף", "Collaborate", AW_COLLAB, { group: "agentic_work_dimension", parentId: "agentic_work", sourceType: "ngg_measure" }),
  scaleMetric("aw_delegate", "האצלה", "Delegate", AW_DELEGATE, { group: "agentic_work_dimension", parentId: "agentic_work", sourceType: "ngg_measure" }),
  scaleMetric("aw_orchestrate", "תזמור", "Orchestrate", AW_ORCH, { group: "agentic_work_dimension", parentId: "agentic_work", sourceType: "ngg_measure" }),
  ...([
    ["aw_funnel_assist", "סיוע", "Assist", AW_ASSIST],
    ["aw_funnel_collaborate", "שיתוף", "Collaborate", AW_COLLAB],
    ["aw_funnel_delegate", "האצלה", "Delegate", AW_DELEGATE],
    ["aw_funnel_orchestrate", "תזמור", "Orchestrate", AW_ORCH],
  ] as Array<[string, string, string, string[]]>).map(([id, he, en, items]) =>
    m({ id, name: { he, en }, kind: "threshold_share", threshold: 4, group: "adoption_funnel", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: items, description: { he: "שיעור המשתמשים שפועלים כך \"לעיתים קרובות\" או \"כמעט תמיד\".", en: "Share of users who act this way \"often\" or \"almost always\"." } }),
  ),
  // ---- trust (higher is not automatically better)
  scaleMetric("stias_trust", "אמון בכלי ה-AI (S-TIAS)", "Trust in the AI tool (S-TIAS)", range("STIAS_", 3), { group: "trust", sourceType: "validated", minAnsweredRatio: 1, neutralDirection: true, description: { he: "ממוצע 3 פריטים בסקאלה 1–7. אמון גבוה אינו בהכרח טוב יותר; יש לפרש לצד התנהגות האימות.", en: "Mean of 3 items on 1–7. Higher trust is not automatically better; read alongside verification behavior." } }, [1, 7]),
  // ---- enablement dimensions
  scaleMetric("enablement_access_resources", "גישה ומשאבים", "Access & resources", ["ORG_ACCESS_01", "ORG_ACCESS_02"], { group: "enablement_dimension", parentId: "organizational_ai_enablement", sourceType: "ngg_measure" }),
  scaleMetric("enablement_policy_governance", "מדיניות וממשל", "Policy & governance", ["ORG_POLICY_01", "ORG_POLICY_02"], { group: "enablement_dimension", parentId: "organizational_ai_enablement", sourceType: "ngg_measure" }),
  scaleMetric("enablement_knowledge_learning", "ידע ולמידה", "Knowledge & learning", ["ORG_LEARN_01", "ORG_LEARN_02"], { group: "enablement_dimension", parentId: "organizational_ai_enablement", sourceType: "ngg_measure" }),
  scaleMetric("enablement_culture", "תרבות", "Culture", ["ORG_CULTURE_01", "ORG_CULTURE_02"], { group: "enablement_dimension", parentId: "organizational_ai_enablement", sourceType: "ngg_measure" }),
  scaleMetric("enablement_strategy", "אסטרטגיה", "Strategy", ["ORG_STRATEGY_01", "ORG_STRATEGY_02"], { group: "enablement_dimension", parentId: "organizational_ai_enablement", sourceType: "ngg_measure" }),
  // ---- team experience of management
  scaleMetric("manager_experience", "חוויית הניהול", "Manager experience", range("MEXP_", 6), { group: "team_experience", sourceType: "ngg_measure", description: { he: "תפיסת הצוות את התמיכה הניהולית בעבודה עם AI.", en: "Team perception of management support for working with AI." } }),
  // ---- agentic management (four dimensions, never collapsed by default)
  scaleMetric("agentic_manage_self", "ניהול עצמי", "Manage Self", range("AM_SELF_", 4), { group: "agentic_management_dimension", sourceType: "ngg_measure", audience: "managers" }),
  scaleMetric("agentic_manage_humans", "ניהול אנשים", "Manage Humans", range("AM_HUMANS_", 4), { group: "agentic_management_dimension", sourceType: "ngg_measure", audience: "managers" }),
  scaleMetric("agentic_manage_ai", "ניהול AI", "Manage AI", range("AM_AI_", 4), { group: "agentic_management_dimension", sourceType: "ngg_measure", audience: "managers" }),
  scaleMetric("agentic_manage_systems", "ניהול מערכות אדם–AI", "Manage Human–AI Systems", range("AM_SYSTEMS_", 6), { group: "agentic_management_dimension", sourceType: "ngg_measure", audience: "managers" }),
  // ---- manager–team pairs (copy §19); gap = team − managers
  ...([
    ["gap_expectations", "בהירות ציפיות", "Clarity of expectations", "AM_HUMANS_01", "MEXP_01"],
    ["gap_opportunities", "זיהוי הזדמנויות", "Opportunity identification", "AM_HUMANS_02", "MEXP_02"],
    ["gap_experimentation", "אקלים התנסות", "Experimentation climate", "AM_HUMANS_03", "MEXP_03"],
    ["gap_responsibility", "בהירות אחריות", "Responsibility clarity", "AM_SYSTEMS_02", "MEXP_04"],
    ["gap_human_judgment", "שמירה על שיקול דעת אנושי", "Protecting human judgment", "AM_HUMANS_04", "MEXP_06"],
  ] as Array<[string, string, string, string, string]>).map(([id, he, en, managerItemId, employeeItemId]) =>
    m({ id, name: { he, en }, kind: "scale_mean", group: "manager_team_pair", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: [managerItemId, employeeItemId], pair: { managerItemId, employeeItemId } }),
  ),
  // ---- outcomes
  scaleMetric("impact_quality", "השפעה על איכות", "Impact on quality", ["IMPACT_QUALITY_01"], { group: "impact", sourceType: "ngg_measure", description: { he: "1 = פוגע משמעותית, 5 = משפר משמעותית. \"קשה לי להעריך\" אינו נכלל.", en: "1 = significantly harms, 5 = significantly improves. \"Hard to assess\" is excluded." } }),
  scaleMetric("impact_time", "השפעה על זמן", "Impact on time", ["IMPACT_TIME_01"], { group: "impact", sourceType: "ngg_measure", description: { he: "1 = מגדיל משמעותית את הזמן, 5 = מקצר משמעותית. \"קשה לי להעריך\" אינו נכלל.", en: "1 = significantly increases time, 5 = significantly reduces it. \"Hard to assess\" is excluded." } }),
  scaleMetric("impact_expansion", "הרחבת יכולות", "Capability expansion", ["IMPACT_EXPANSION_01"], { group: "impact", sourceType: "ngg_measure" }),
];

/** Items whose answer distributions are cached for dashboards. */
export const DISTRIBUTION_ITEMS = ["USE_01", "USE_02", "USE_04", "USE_06", "IMPACT_QUALITY_01", "IMPACT_TIME_01", "BARRIER_01", "ENABLEMENT_NEED_01", "DELEGATION_MAP", "DELEGATION_OPPORTUNITY"];

/** The default baseline template, in the routing order of copy §16. */
export const BASELINE_TEMPLATE_SECTION_KEYS = [
  "SECTION_CONTEXT",
  "SECTION_AI_USAGE",
  "SECTION_GAIL_17",
  "SECTION_AGENTIC_WORK",
  "SECTION_STIAS_3",
  "SECTION_VERIFICATION",
  "SECTION_ORG_ENABLEMENT",
  "SECTION_MANAGER_EXPERIENCE",
  "SECTION_AGENTIC_MANAGEMENT",
  "SECTION_DELEGATION_MAP",
  "SECTION_OUTCOMES_BARRIERS",
  "SECTION_OPEN_TEXT",
];
