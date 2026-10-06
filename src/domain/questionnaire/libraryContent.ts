/**
 * The NGG Section Library and Measurement Library (spec §10, §21).
 *
 * Provenance rules (design §9, spec §3.1):
 * - `validated` items are locked. Their wording here is a PLACEHOLDER and must be replaced with the
 *   original wording of the licensed source scale by NGG's methodology lead before a live wave.
 * - `ngg_measure` items are NGG's research-informed measures. Wording is marked `illustrative`
 *   until methodological approval.
 * All content is bilingual (Hebrew primary).
 */
import type { LocalizedText } from "@/domain/shared/localized";
import type { Audience, QuestionType, ResearchStatus, SectionCategory, SourceType } from "@/domain/shared/enums";
import type { DisplayRule } from "./definition";
import type { QuestionTemplateContent } from "./library";
import type { MetricConfig } from "@/domain/measurement/config";
import { LIKERT_5_LABELS } from "./library";

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
  sourceType: SourceType;
  researchStatus: ResearchStatus;
  audience: Audience;
  recommendedCore?: boolean;
  longitudinalCore?: boolean;
  mandatory?: boolean;
  sourceReference?: string;
  displayRules?: DisplayRule[];
  questions: LibraryQuestion[];
}

const L5 = { min: 1, max: 5, labels: LIKERT_5_LABELS };
const IF_MANAGER: DisplayRule[] = [{ field: "q:ctx_is_manager", operator: "eq", value: "yes" }];
const IF_EMPLOYEE: DisplayRule[] = [{ field: "q:ctx_is_manager", operator: "eq", value: "no" }];
const IF_AI_USER: DisplayRule[] = [{ field: "q:ctx_ai_use_30d", operator: "neq", value: "none" }];

const likert = (canonicalId: string, he: string, en: string, metricId: string, extra: Partial<LibraryQuestion> = {}): LibraryQuestion => ({
  canonicalId,
  type: "likert_5",
  content: { text: { he, en }, scale: L5, wordingStatus: "illustrative" },
  metricId,
  ...extra,
});

const validatedItem = (canonicalId: string, scaleName: LocalizedText, index: number, dimension: LocalizedText, metricId: string): LibraryQuestion => ({
  canonicalId,
  type: "likert_5",
  locked: true,
  content: {
    text: {
      he: `[נוסח פריט ${index} מהסולם המתוקף — ${scaleName.he} · ${dimension.he}]`,
      en: `[Item ${index} wording from the validated scale — ${scaleName.en} · ${dimension.en}]`,
    },
    scale: L5,
    wordingStatus: "placeholder",
  },
  metricId,
});

/* ------------------------------------------------------------- sections */

export const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    key: "org_context",
    version: "1.0",
    category: "core_context",
    name: { he: "הקשר ארגוני", en: "Organizational Context" },
    description: { he: "יחידה, משפחת תפקיד ואתר. משמש לפילוח מצרפי בלבד.", en: "Unit, role family and location. Used for aggregate segmentation only." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    mandatory: true,
    questions: [
      {
        canonicalId: "ctx_department",
        type: "single_choice",
        content: { text: { he: "באיזו יחידה את/ה עובד/ת?", en: "Which unit do you work in?" }, optionsFrom: "departments", segmentKey: "department", allowPreferNotToAnswer: true },
      },
      {
        canonicalId: "ctx_role_family",
        type: "single_choice",
        content: { text: { he: "איזו משפחת תפקיד מתארת הכי טוב את עבודתך?", en: "Which role family best describes your work?" }, optionsFrom: "roleFamilies", segmentKey: "role_family" },
      },
      {
        canonicalId: "ctx_location",
        type: "single_choice",
        required: false,
        content: { text: { he: "באיזה אתר את/ה עובד/ת בעיקר?", en: "Where are you mainly based?" }, optionsFrom: "locations", segmentKey: "location" },
      },
    ],
  },
  {
    key: "role_seniority",
    version: "1.0",
    category: "core_context",
    name: { he: "תפקיד וותק", en: "Role & Seniority" },
    description: { he: "אחריות ניהולית וותק. קובע את הניתוב למודולים למנהלים.", en: "Managerial responsibility and seniority. Drives routing to manager modules." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    mandatory: true,
    questions: [
      {
        canonicalId: "ctx_is_manager",
        type: "single_choice",
        content: {
          text: { he: "האם יש לך אחריות ניהולית ישירה על עובדים?", en: "Do you directly manage other employees?" },
          options: [
            { value: "yes", label: { he: "כן", en: "Yes" } },
            { value: "no", label: { he: "לא", en: "No" } },
          ],
          segmentKey: "is_manager",
          allowPreferNotToAnswer: false,
        },
      },
      {
        canonicalId: "ctx_seniority",
        type: "single_choice",
        content: { text: { he: "כמה זמן את/ה בארגון?", en: "How long have you been with the organization?" }, optionsFrom: "seniorityGroups", segmentKey: "seniority" },
      },
      {
        canonicalId: "ctx_team_size",
        type: "single_choice",
        content: {
          text: { he: "כמה עובדים מדווחים אליך ישירות?", en: "How many people report to you directly?" },
          options: [
            { value: "1_3", label: { he: "1–3", en: "1–3" } },
            { value: "4_8", label: { he: "4–8", en: "4–8" } },
            { value: "9_15", label: { he: "9–15", en: "9–15" } },
            { value: "16_plus", label: { he: "16 ומעלה", en: "16 or more" } },
          ],
          displayRules: IF_MANAGER,
        },
      },
    ],
  },
  {
    key: "ai_usage",
    version: "1.0",
    category: "ai_adoption",
    name: { he: "שימוש ב-AI", en: "AI Usage" },
    description: { he: "תדירות ועומק השימוש בכלי AI בעבודה בחודש האחרון.", en: "Frequency and depth of AI tool use at work in the last month." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    questions: [
      {
        canonicalId: "ctx_ai_use_30d",
        type: "single_choice",
        content: {
          text: { he: "באיזו תדירות השתמשת בכלי AI לצורכי עבודה בחודש האחרון?", en: "How often did you use AI tools for work in the last 30 days?" },
          options: [
            { value: "none", label: { he: "בכלל לא", en: "Not at all" }, score: 1 },
            { value: "once_twice", label: { he: "פעם או פעמיים", en: "Once or twice" }, score: 2 },
            { value: "weekly", label: { he: "בערך פעם בשבוע", en: "About once a week" }, score: 3 },
            { value: "several_weekly", label: { he: "כמה פעמים בשבוע", en: "Several times a week" }, score: 4 },
            { value: "daily", label: { he: "כמעט כל יום", en: "Almost every day" }, score: 5 },
          ],
          allowPreferNotToAnswer: false,
        },
        metricId: "ai_usage",
      },
      likert("usage_routine", "כלי AI הם חלק משגרת העבודה שלי.", "AI tools are part of my daily work routine.", "ai_usage", { content: { text: { he: "כלי AI הם חלק משגרת העבודה שלי.", en: "AI tools are part of my daily work routine." }, scale: L5, wordingStatus: "illustrative", displayRules: IF_AI_USER } }),
      {
        canonicalId: "usage_tools",
        type: "multi_select",
        required: false,
        content: {
          text: { he: "באילו סוגי כלי AI השתמשת לעבודה?", en: "Which kinds of AI tools did you use for work?" },
          options: [
            { value: "chat_assistant", label: { he: "עוזר שיחה כללי (צ׳אט)", en: "General chat assistant" } },
            { value: "office_copilot", label: { he: "AI משולב בכלי משרד", en: "AI built into office tools" } },
            { value: "coding", label: { he: "עוזר קוד", en: "Coding assistant" } },
            { value: "internal", label: { he: "כלי AI פנים-ארגוני", en: "Internal company AI tool" } },
            { value: "agents", label: { he: "סוכני AI / אוטומציות", en: "AI agents / automations" } },
          ],
          displayRules: IF_AI_USER,
        },
      },
    ],
  },
  {
    key: "use_case_breadth",
    version: "1.0",
    category: "ai_adoption",
    name: { he: "רוחב השימושים", en: "Use Case Breadth" },
    description: { he: "לאילו סוגי משימות משמש ה-AI ואילו דפוסי עבודה קיימים.", en: "Which task types AI is used for and which work patterns exist." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IF_AI_USER,
    questions: [
      {
        canonicalId: "usecase_types",
        type: "multi_select",
        metricId: "use_case_breadth",
        content: {
          text: { he: "לאילו משימות השתמשת ב-AI בחודש האחרון?", en: "Which tasks did you use AI for in the last month?" },
          options: [
            { value: "writing", label: { he: "כתיבה וניסוח", en: "Writing and editing" } },
            { value: "analysis", label: { he: "ניתוח נתונים", en: "Data analysis" } },
            { value: "summaries", label: { he: "סיכום מסמכים ופגישות", en: "Summarising documents and meetings" } },
            { value: "presentations", label: { he: "הכנת מצגות", en: "Preparing presentations" } },
            { value: "automation", label: { he: "אוטומציה של תהליכים", en: "Process automation" } },
            { value: "research", label: { he: "מחקר והכנה", en: "Research and preparation" } },
            { value: "decisions", label: { he: "תמיכה בקבלת החלטות", en: "Decision support" } },
            { value: "code", label: { he: "כתיבת קוד", en: "Writing code" } },
            { value: "other", label: { he: "אחר", en: "Other" } },
          ],
        },
      },
      {
        canonicalId: "work_patterns",
        type: "multi_select",
        content: {
          text: { he: "אילו מהדפוסים הבאים מתארים את העבודה שלך עם AI בחודש האחרון?", en: "Which of these patterns describe how you worked with AI in the last month?" },
          helpText: { he: "אפשר לבחור כמה. אין כאן מדרג — רק תיאור.", en: "Choose all that apply. This is a description, not a ranking." },
          options: [
            { value: "assist", label: { he: "סיוע — AI עוזר לי במשימה שאני מבצע/ת", en: "Assist — AI helps with a task I perform" } },
            { value: "collaborate", label: { he: "שיתוף — עובד/ת עם AI הלוך ושוב על תוצר", en: "Collaborate — iterating with AI on an output" } },
            { value: "delegate", label: { he: "האצלה — מוסר/ת ל-AI משימה שלמה ובודק/ת את התוצר", en: "Delegate — handing AI a whole task and reviewing the result" } },
            { value: "orchestrate", label: { he: "תזמור — מפעיל/ה כמה כלים או סוכנים בזרימת עבודה", en: "Orchestrate — running several tools or agents in a workflow" } },
          ],
        },
      },
    ],
  },
  {
    key: "tool_access",
    version: "1.0",
    category: "ai_adoption",
    name: { he: "גישה לכלים", en: "Tool Access" },
    description: { he: "אילו כלים מאושרים זמינים ומה חסר.", en: "Which approved tools are available and what is missing." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    questions: [
      {
        canonicalId: "access_approved_tools",
        type: "single_choice",
        content: {
          text: { he: "האם יש לך גישה לכלי AI שאושרו על ידי הארגון?", en: "Do you have access to AI tools approved by the organization?" },
          options: [
            { value: "yes_sufficient", label: { he: "כן, והם מספיקים לי", en: "Yes, and they are sufficient" } },
            { value: "yes_insufficient", label: { he: "כן, אבל הם לא מספיקים", en: "Yes, but they are not sufficient" } },
            { value: "no", label: { he: "לא", en: "No" } },
            { value: "unknown", label: { he: "לא יודע/ת", en: "I don't know" } },
          ],
        },
      },
      {
        canonicalId: "access_missing",
        type: "short_text",
        required: false,
        content: { text: { he: "איזה כלי או יכולת חסרים לך?", en: "Which tool or capability are you missing?" } },
      },
    ],
  },
  {
    key: "gen_ai_literacy",
    version: "1.0",
    category: "validated_measures",
    name: { he: "אוריינות AI גנרטיבית", en: "Generative AI Literacy" },
    description: { he: "סולם מחקרי מתוקף. ניסוח, סקאלה וחישוב נעולים.", en: "Validated research scale. Wording, scale and scoring are locked." },
    sourceType: "validated",
    researchStatus: "validated",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    sourceReference: "Validated generative AI literacy scale — original wording to be inserted by NGG methodology lead (licensed source).",
    questions: (() => {
      const scale = { he: "אוריינות AI גנרטיבית", en: "Generative AI Literacy" };
      const dims: Array<[string, LocalizedText, string]> = [
        ["basic_operation", { he: "הפעלה בסיסית", en: "Basic Operation" }, "ai_literacy_basic_operation"],
        ["prompting", { he: "ניסוח בקשות", en: "Prompting" }, "ai_literacy_prompting"],
        ["evaluation", { he: "הערכת תוצרים", en: "Evaluation" }, "ai_literacy_evaluation"],
        ["innovative", { he: "יישום חדשני", en: "Innovative Application" }, "ai_literacy_innovative_application"],
        ["ethics", { he: "אתיקה וציות", en: "Ethics & Compliance" }, "ai_literacy_ethics_compliance"],
      ];
      let index = 0;
      return dims.flatMap(([key, label, metric]) => [1, 2].map((n) => validatedItem(`ai_lit_${key}_0${n}`, scale, ++index, label, metric)));
    })(),
  },
  {
    key: "trust_in_ai",
    version: "1.0",
    category: "validated_measures",
    name: { he: "אמון ב-AI", en: "Trust in AI" },
    description: { he: "סולם מחקרי מתוקף. מוצג למי שהשתמש ב-AI בחודש האחרון.", en: "Validated research scale. Shown to respondents who used AI in the last month." },
    sourceType: "validated",
    researchStatus: "validated",
    audience: "all",
    displayRules: IF_AI_USER,
    sourceReference: "Validated trust-in-AI scale — original wording to be inserted by NGG methodology lead (licensed source).",
    questions: [1, 2, 3, 4].map((n) => validatedItem(`trust_ai_0${n}`, { he: "אמון ב-AI", en: "Trust in AI" }, n, { he: "אמון", en: "Trust" }, "trust_ai")),
  },
  {
    key: "agentic_work",
    version: "2.1",
    category: "ngg_measures",
    name: { he: "עבודה אג׳נטית", en: "Agentic Work" },
    description: { he: "עד כמה העבודה עם AI עוברת מסיוע נקודתי להאצלה ותזמור של משימות.", en: "How far work with AI moves from point assistance toward delegation and orchestration." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IF_AI_USER,
    questions: [
      likert("agw_01", "בחודש האחרון האצלתי לכלי AI משימה שלמה — מהגדרת המטרה ועד תוצר מוכן לבדיקה.", "In the last month I delegated a complete task to an AI tool — from defining the goal to a result ready for review.", "agentic_work"),
      likert("agw_02", "אני מגדיר/ה ל-AI מטרה ואילוצים במקום להנחות אותו צעד-צעד.", "I give AI a goal and constraints rather than step-by-step instructions.", "agentic_work"),
      likert("agw_03", "אני משלב/ת כמה כלי AI או שלבים בזרימת עבודה אחת.", "I combine several AI tools or steps into one workflow.", "agentic_work"),
      likert("agw_04", "יש לי משימות חוזרות שה-AI מבצע עבורי באופן קבוע.", "I have recurring tasks that AI performs for me on a regular basis.", "agentic_work"),
      likert("agw_05", "אני יודע/ת אילו משימות נכון להאציל ל-AI ואילו לא.", "I know which tasks are appropriate to delegate to AI and which are not.", "agentic_work"),
      likert("agw_06", "אני מעדיף/ה לבצע את המשימה בעצמי מאשר להסביר אותה ל-AI.", "I prefer doing the task myself rather than explaining it to AI.", "agentic_work", { reverseCoded: true }),
    ],
  },
  {
    key: "verification",
    version: "2.0",
    category: "ngg_measures",
    name: { he: "התנהגות אימות", en: "Verification Behavior" },
    description: { he: "האם ועד כמה תוצרי AI נבדקים לפני שימוש.", en: "Whether and how AI outputs are checked before use." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IF_AI_USER,
    questions: [
      likert("ver_01", "אני בודק/ת עובדות ומספרים בתוצרי AI לפני שאני משתמש/ת בהם.", "I check facts and figures in AI outputs before using them.", "verification"),
      likert("ver_02", "אני יודע/ת לזהות מתי תוצר AI אינו אמין.", "I can tell when an AI output is unreliable.", "verification"),
      likert("ver_03", "כשאני מעביר/ה תוצר AI הלאה, אני מציין/ת שנעזרתי ב-AI.", "When I pass on an AI output, I note that AI was used.", "verification"),
      likert("ver_04", "אני משתמש/ת בתוצרי AI כפי שהם, בלי לבדוק אותם.", "I use AI outputs as they are, without checking them.", "verification", { reverseCoded: true }),
    ],
  },
  {
    key: "org_enablement",
    version: "2.0",
    category: "ngg_measures",
    name: { he: "אפשור ארגוני ל-AI", en: "Organizational AI Enablement" },
    description: { he: "גישה ומשאבים, מדיניות, ידע ולמידה, תרבות ואסטרטגיה.", en: "Access & resources, policy & governance, knowledge & learning, culture and strategy." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    longitudinalCore: true,
    questions: [
      likert("en_access_01", "יש לי גישה לכלי ה-AI שאני צריך/ה לעבודתי.", "I have access to the AI tools I need for my work.", "enablement_access_resources"),
      likert("en_access_02", "הארגון מקצה זמן ומשאבים ללמידה והתנסות ב-AI.", "The organization allocates time and resources for learning and experimenting with AI.", "enablement_access_resources"),
      likert("en_access_03", "כשאני נתקל/ת בבעיה טכנית בכלי AI, יש למי לפנות.", "When I hit a technical problem with an AI tool, there is someone to turn to.", "enablement_access_resources"),
      likert("en_policy_01", "ברור לי מה מותר ומה אסור לעשות עם AI בעבודה.", "It is clear to me what is and is not allowed with AI at work.", "enablement_policy_governance"),
      likert("en_policy_02", "הארגון הגדיר כללים לשימוש במידע רגיש בכלי AI.", "The organization has rules for using sensitive information in AI tools.", "enablement_policy_governance"),
      likert("en_policy_03", "אני יודע/ת מי אחראי/ת על נושא ה-AI בארגון.", "I know who is responsible for AI in the organization.", "enablement_policy_governance"),
      likert("en_know_01", "קיבלתי הדרכה מספקת על שימוש ב-AI בעבודה.", "I have received sufficient training on using AI at work.", "enablement_knowledge_learning"),
      likert("en_know_02", "אנחנו משתפים זה את זה בדרכים טובות לעבוד עם AI.", "We share good ways of working with AI with each other.", "enablement_knowledge_learning"),
      likert("en_know_03", "יש בארגון מקום לשאול שאלות וללמוד על AI.", "There is a place in the organization to ask questions and learn about AI.", "enablement_knowledge_learning"),
      likert("en_cult_01", "מקובל אצלנו לנסות דברים חדשים עם AI, גם אם לא תמיד מצליחים.", "It is accepted here to try new things with AI, even when they do not always work.", "enablement_culture"),
      likert("en_cult_02", "שימוש ב-AI נתפס אצלנו כיתרון ולא כקיצור דרך.", "Using AI is seen here as an advantage, not as cutting corners.", "enablement_culture"),
      likert("en_cult_03", "אני יכול/ה לומר בגלוי שנעזרתי ב-AI בלי לחשוש.", "I can openly say I used AI without worrying.", "enablement_culture"),
      likert("en_strat_01", "ברור לי לאן הארגון רוצה להגיע עם AI.", "It is clear to me where the organization wants to go with AI.", "enablement_strategy"),
      likert("en_strat_02", "ההנהלה מסבירה כיצד AI קשור ליעדי הארגון.", "Leadership explains how AI relates to the organization's goals.", "enablement_strategy"),
      likert("en_strat_03", "יש תוכנית סדורה להטמעת AI ביחידה שלי.", "There is an orderly plan for adopting AI in my unit.", "enablement_strategy"),
    ],
  },
  {
    key: "manager_experience",
    version: "1.2",
    category: "ngg_measures",
    name: { he: "חוויית העובד מול המנהל/ת", en: "Manager Experience" },
    description: { he: "כיצד עובדים חווים את ניהול ה-AI של המנהל/ת הישיר/ה. מושווה לדיווח העצמי של מנהלים.", en: "How employees experience their direct manager's AI leadership. Compared with managers' self-report." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "employees",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IF_EMPLOYEE,
    questions: [
      likert("mx_clarity", "המנהל/ת שלי מסביר/ה בבירור כיצד מצופה מאיתנו להשתמש ב-AI.", "My manager clearly communicates how we are expected to use AI.", "gap_ai_clarity"),
      likert("mx_experiment", "המנהל/ת שלי מעודד/ת אותנו להתנסות ב-AI.", "My manager encourages us to experiment with AI.", "gap_experimentation"),
      likert("mx_verify", "המנהל/ת שלי מצפה שנבדוק תוצרי AI לפני שימוש.", "My manager expects us to verify AI outputs before using them.", "gap_verification"),
      likert("mx_judgment", "המנהל/ת שלי מבהיר/ה אילו החלטות נשארות בידי בני אדם.", "My manager makes clear which decisions stay with people.", "gap_human_judgment"),
    ],
  },
  {
    key: "agentic_management",
    version: "2.1",
    category: "ngg_measures",
    name: { he: "ניהול אג׳נטי", en: "Agentic Management" },
    description: { he: "ארבעה ממדים: ניהול עצמי, ניהול אנשים, ניהול AI וניהול מערכות אדם–AI. למנהלים בלבד.", en: "Four dimensions: Manage Self, Manage Humans, Manage AI and Manage Human–AI Systems. Managers only." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "managers",
    recommendedCore: true,
    longitudinalCore: true,
    displayRules: IF_MANAGER,
    questions: [
      likert("am_self_01", "אני מקדיש/ה זמן קבוע ללמידה של יכולות AI חדשות.", "I set aside regular time to learn new AI capabilities.", "agentic_manage_self"),
      likert("am_self_02", "אני משתמש/ת ב-AI בעבודה הניהולית שלי, לא רק מדבר/ת על זה.", "I use AI in my own managerial work, not just talk about it.", "agentic_manage_self"),
      likert("am_self_03", "אני יודע/ת לזהות מתי אני סומך/ת על AI יותר מדי.", "I can recognise when I rely on AI too much.", "agentic_manage_self"),
      likert("am_humans_01", "אני מסביר/ה לצוות אילו משימות מתאימות ל-AI ואילו דורשות אדם.", "I explain to my team which tasks suit AI and which require a person.", "agentic_manage_humans"),
      likert("am_humans_02", "אני מתייחס/ת לחששות של עובדים מ-AI באופן פתוח.", "I address employees' concerns about AI openly.", "agentic_manage_humans"),
      likert("am_humans_03", "אני מתאים/ה את הציפיות מהצוות ליכולות ה-AI הזמינות.", "I adjust expectations of the team to the AI capabilities available.", "agentic_manage_humans"),
      likert("am_ai_01", "אני מגדיר/ה ל-AI משימות ברורות עם קריטריוני הצלחה.", "I define clear tasks with success criteria for AI.", "agentic_manage_ai"),
      likert("am_ai_02", "אני בודק/ת תוצרי AI לפני שהם משפיעים על החלטות.", "I review AI outputs before they influence decisions.", "agentic_manage_ai"),
      likert("am_ai_03", "אני יודע/ת לאפיין מתי תוצר AI אינו טוב מספיק.", "I can tell when an AI output is not good enough.", "agentic_manage_ai"),
      likert("am_sys_01", "עיצבתי בצוות לפחות זרימת עבודה אחת שמשלבת אנשים ו-AI עם חלוקת סמכויות ברורה.", "I have designed at least one team workflow that combines people and AI with clear decision rights.", "agentic_manage_systems"),
      likert("am_sys_02", "בזרימות העבודה בצוות יש נקודת בקרה אנושית מוגדרת.", "Team workflows have a defined human review point.", "agentic_manage_systems"),
      likert("am_sys_03", "אני מודד/ת האם שילוב ה-AI משפר את תוצאות הצוות.", "I measure whether integrating AI improves the team's outcomes.", "agentic_manage_systems"),
      likert("mg_clarity", "אני מסביר/ה בבירור לצוות כיצד מצופה להשתמש ב-AI.", "I clearly communicate to my team how AI should be used.", "gap_ai_clarity"),
      likert("mg_experiment", "אני מעודד/ת את הצוות להתנסות ב-AI.", "I encourage my team to experiment with AI.", "gap_experimentation"),
      likert("mg_verify", "אני מצפה מהצוות לבדוק תוצרי AI לפני שימוש.", "I expect my team to verify AI outputs before using them.", "gap_verification"),
      likert("mg_judgment", "אני מבהיר/ה לצוות אילו החלטות נשארות בידי בני אדם.", "I make clear to my team which decisions stay with people.", "gap_human_judgment"),
    ],
  },
  {
    key: "delegation_map",
    version: "1.0",
    category: "ngg_measures",
    name: { he: "מפת האצלה אדם–AI", en: "Human–AI Delegation Map" },
    description: { he: "לכל פעילות ניהולית: מי מוביל היום — אדם, AI מסייע, AI מואצל או אוטונומי. למנהלים בלבד.", en: "For each management activity: who leads today — human, AI-assisted, AI-delegated or autonomous. Managers only." },
    sourceType: "ngg_measure",
    researchStatus: "experimental",
    audience: "managers",
    displayRules: IF_MANAGER,
    questions: [
      {
        canonicalId: "dm_current",
        type: "matrix",
        content: {
          text: { he: "כיצד מתבצעת כל פעילות היום?", en: "How is each activity carried out today?" },
          wordingStatus: "illustrative",
          matrixRows: [
            { key: "planning", label: { he: "תכנון עבודה ותיעדוף", en: "Work planning and prioritisation" } },
            { key: "reporting", label: { he: "דיווח וסיכומי סטטוס", en: "Reporting and status summaries" } },
            { key: "feedback", label: { he: "משוב לעובדים", en: "Employee feedback" } },
            { key: "decisions", label: { he: "קבלת החלטות תפעוליות", en: "Operational decisions" } },
            { key: "communication", label: { he: "תקשורת שוטפת עם הצוות", en: "Day-to-day team communication" } },
          ],
          matrixColumns: [
            { value: "human_led", label: { he: "אדם מוביל", en: "Human-led" } },
            { value: "ai_assisted", label: { he: "AI מסייע", en: "AI-assisted" } },
            { value: "ai_delegated", label: { he: "מואצל ל-AI", en: "AI-delegated" } },
            { value: "autonomous", label: { he: "אוטונומי", en: "Autonomous" } },
          ],
        },
      },
      {
        canonicalId: "dm_opportunity",
        type: "matrix",
        required: false,
        content: {
          text: { he: "ואיך היית רוצה שכל פעילות תתבצע בעוד שנה?", en: "And how would you like each activity to be carried out a year from now?" },
          wordingStatus: "illustrative",
          matrixRows: [
            { key: "planning", label: { he: "תכנון עבודה ותיעדוף", en: "Work planning and prioritisation" } },
            { key: "reporting", label: { he: "דיווח וסיכומי סטטוס", en: "Reporting and status summaries" } },
            { key: "feedback", label: { he: "משוב לעובדים", en: "Employee feedback" } },
            { key: "decisions", label: { he: "קבלת החלטות תפעוליות", en: "Operational decisions" } },
            { key: "communication", label: { he: "תקשורת שוטפת עם הצוות", en: "Day-to-day team communication" } },
          ],
          matrixColumns: [
            { value: "human_led", label: { he: "אדם מוביל", en: "Human-led" } },
            { value: "ai_assisted", label: { he: "AI מסייע", en: "AI-assisted" } },
            { value: "ai_delegated", label: { he: "מואצל ל-AI", en: "AI-delegated" } },
            { value: "autonomous", label: { he: "אוטונומי", en: "Autonomous" } },
          ],
        },
      },
    ],
  },
  {
    key: "impact_productivity",
    version: "1.1",
    category: "outcomes",
    name: { he: "השפעה ופריון", en: "Impact & Productivity" },
    description: { he: "השפעת ה-AI הנתפסת על איכות, מהירות ועומס.", en: "Perceived impact of AI on quality, speed and workload." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    longitudinalCore: true,
    displayRules: IF_AI_USER,
    questions: [
      likert("imp_01", "AI חוסך לי זמן משמעותי בשבוע עבודה רגיל.", "AI saves me significant time in a regular work week.", "impact"),
      likert("imp_02", "AI משפר את איכות התוצרים שלי.", "AI improves the quality of my work.", "impact"),
      likert("imp_03", "בזכות AI אני מספיק/ה לעסוק במשימות חשובות יותר.", "Thanks to AI I get to work on more important tasks.", "impact"),
      likert("imp_04", "AI מוסיף לי עומס ולא מוריד.", "AI adds to my workload rather than reducing it.", "impact", { reverseCoded: true }),
    ],
  },
  {
    key: "barriers",
    version: "1.0",
    category: "outcomes",
    name: { he: "חסמים", en: "Barriers" },
    description: { he: "מה מונע שימוש רחב או עמוק יותר ב-AI.", en: "What prevents broader or deeper AI use." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    recommendedCore: true,
    questions: [
      {
        canonicalId: "barriers_main",
        type: "multi_select",
        content: {
          text: { he: "מה הכי מגביל את השימוש שלך ב-AI בעבודה?", en: "What most limits your use of AI at work?" },
          helpText: { he: "בחרו עד שלושה.", en: "Choose up to three." },
          options: [
            { value: "no_access", label: { he: "אין גישה לכלים מתאימים", en: "No access to suitable tools" } },
            { value: "no_time", label: { he: "אין זמן ללמוד", en: "No time to learn" } },
            { value: "unclear_policy", label: { he: "לא ברור מה מותר", en: "Unclear what is allowed" } },
            { value: "data_concerns", label: { he: "חשש לאבטחת מידע ופרטיות", en: "Data security and privacy concerns" } },
            { value: "quality", label: { he: "התוצרים לא מספיק טובים", en: "Outputs are not good enough" } },
            { value: "skills", label: { he: "חסרות לי מיומנויות", en: "I lack the skills" } },
            { value: "no_need", label: { he: "אין לי צורך בעבודה שלי", en: "No need in my work" } },
            { value: "manager", label: { he: "המנהל/ת לא מעודד/ת", en: "My manager does not encourage it" } },
            { value: "job_fear", label: { he: "חשש להשלכות על התפקיד", en: "Concern about consequences for my role" } },
          ],
        },
      },
    ],
  },
  {
    key: "opportunities",
    version: "1.0",
    category: "outcomes",
    name: { he: "הזדמנויות", en: "Opportunities" },
    description: { he: "היכן העובדים רוצים להיעזר ב-AI בחצי השנה הקרובה.", en: "Where employees want AI help in the next six months." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    questions: [
      {
        canonicalId: "opp_areas",
        type: "multi_select",
        content: {
          text: { he: "באילו תחומים הכי היית רוצה להיעזר ב-AI בחצי השנה הקרובה?", en: "In which areas would you most like AI help in the next six months?" },
          helpText: { he: "אפשר לבחור כמה תשובות.", en: "Choose all that apply." },
          options: [
            { value: "writing", label: { he: "כתיבה וניסוח", en: "Writing and editing" } },
            { value: "analysis", label: { he: "ניתוח נתונים", en: "Data analysis" } },
            { value: "summaries", label: { he: "סיכום מסמכים ופגישות", en: "Summarising documents and meetings" } },
            { value: "presentations", label: { he: "הכנת מצגות", en: "Preparing presentations" } },
            { value: "automation", label: { he: "אוטומציה של תהליכים", en: "Process automation" } },
            { value: "research", label: { he: "מחקר והכנה", en: "Research and preparation" } },
            { value: "decisions", label: { he: "תמיכה בקבלת החלטות", en: "Decision support" } },
            { value: "other", label: { he: "אחר", en: "Other" } },
          ],
        },
      },
    ],
  },
  {
    key: "open_questions",
    version: "1.0",
    category: "qualitative",
    name: { he: "שאלות פתוחות", en: "Open Questions" },
    description: { he: "תשובות חופשיות. מנותחות תמטית לאחר הסרת פרטים מזהים.", en: "Free-text answers. Analysed thematically after removing identifying details." },
    sourceType: "ngg_measure",
    researchStatus: "ngg_measure",
    audience: "all",
    questions: [
      { canonicalId: "open_helped", type: "long_text", required: false, content: { text: { he: "מה היה הדבר האחד שהכי עזר לך להשתמש ב-AI בעבודה?", en: "What is the one thing that most helped you use AI at work?" } } },
      { canonicalId: "open_change", type: "long_text", required: false, content: { text: { he: "מה דבר אחד שהיית משנה באופן שבו הארגון מטמיע AI?", en: "What is one thing you would change about how the organization adopts AI?" } } },
    ],
  },
  {
    key: "client_questions",
    version: "1.0",
    category: "custom",
    name: { he: "שאלות לקוח", en: "Client Questions" },
    description: { he: "שאלות ייעודיות לפרויקט. לא נכללות במדדי הליבה.", en: "Project-specific questions. Not part of the core metrics." },
    sourceType: "client_custom",
    researchStatus: "custom",
    audience: "all",
    questions: [],
  },
];

/* --------------------------------------------------------- metric library */

const items = (prefix: string, ids: string[]) => ids.map((id) => `${prefix}${id}`);

export const METRIC_DEFINITIONS: MetricConfig[] = [
  // ---- core profile
  { id: "ai_usage", name: { he: "שימוש ב-AI", en: "AI Usage" }, kind: "scale_mean", group: "core", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ctx_ai_use_30d", "usage_routine"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: true, audience: "all", description: { he: "תדירות השימוש ומידת ההטמעה בשגרה.", en: "Usage frequency and integration into routine." } },
  { id: "ai_literacy", name: { he: "אוריינות AI", en: "AI Literacy" }, kind: "scale_mean", group: "core", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: items("ai_lit_", ["basic_operation_01", "basic_operation_02", "prompting_01", "prompting_02", "evaluation_01", "evaluation_02", "innovative_01", "innovative_02", "ethics_01", "ethics_02"]), reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: true, audience: "all", description: { he: "סולם מתוקף בחמישה ממדים.", en: "Validated scale with five dimensions." } },
  { id: "agentic_work", name: { he: "עבודה אג׳נטית", en: "Agentic Work" }, kind: "scale_mean", group: "core", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["agw_01", "agw_02", "agw_03", "agw_04", "agw_05", "agw_06"], reverseCodedIds: ["agw_06"], minAnsweredRatio: 0.5, coreProfile: true, audience: "all" },
  { id: "verification", name: { he: "התנהגות אימות", en: "Verification" }, kind: "scale_mean", group: "core", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ver_01", "ver_02", "ver_03", "ver_04"], reverseCodedIds: ["ver_04"], minAnsweredRatio: 0.5, coreProfile: true, audience: "all" },
  { id: "org_enablement", name: { he: "אפשור ארגוני", en: "Organizational Enablement" }, kind: "scale_mean", group: "core", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_access_01", "en_access_02", "en_access_03", "en_policy_01", "en_policy_02", "en_policy_03", "en_know_01", "en_know_02", "en_know_03", "en_cult_01", "en_cult_02", "en_cult_03", "en_strat_01", "en_strat_02", "en_strat_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: true, audience: "all" },
  { id: "agentic_management", name: { he: "ניהול אג׳נטי", en: "Agentic Management" }, kind: "scale_mean", group: "core", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["am_self_01", "am_self_02", "am_self_03", "am_humans_01", "am_humans_02", "am_humans_03", "am_ai_01", "am_ai_02", "am_ai_03", "am_sys_01", "am_sys_02", "am_sys_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: true, audience: "managers", description: { he: "ממוצע ארבעת הממדים. מוצג כפרופיל, לא כציון יחיד.", en: "Mean of the four dimensions. Presented as a profile, not a single score." } },
  // ---- AI literacy dimensions
  { id: "ai_literacy_basic_operation", name: { he: "הפעלה בסיסית", en: "Basic Operation" }, kind: "scale_mean", group: "ai_literacy_dimension", parentId: "ai_literacy", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ai_lit_basic_operation_01", "ai_lit_basic_operation_02"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "ai_literacy_prompting", name: { he: "ניסוח בקשות", en: "Prompting" }, kind: "scale_mean", group: "ai_literacy_dimension", parentId: "ai_literacy", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ai_lit_prompting_01", "ai_lit_prompting_02"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "ai_literacy_evaluation", name: { he: "הערכת תוצרים", en: "Evaluation" }, kind: "scale_mean", group: "ai_literacy_dimension", parentId: "ai_literacy", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ai_lit_evaluation_01", "ai_lit_evaluation_02"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "ai_literacy_innovative_application", name: { he: "יישום חדשני", en: "Innovative Application" }, kind: "scale_mean", group: "ai_literacy_dimension", parentId: "ai_literacy", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ai_lit_innovative_01", "ai_lit_innovative_02"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "ai_literacy_ethics_compliance", name: { he: "אתיקה וציות", en: "Ethics & Compliance" }, kind: "scale_mean", group: "ai_literacy_dimension", parentId: "ai_literacy", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["ai_lit_ethics_01", "ai_lit_ethics_02"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  // ---- enablement dimensions
  { id: "enablement_access_resources", name: { he: "גישה ומשאבים", en: "Access & Resources" }, kind: "scale_mean", group: "enablement_dimension", parentId: "org_enablement", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_access_01", "en_access_02", "en_access_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "enablement_policy_governance", name: { he: "מדיניות וממשל", en: "Policy & Governance" }, kind: "scale_mean", group: "enablement_dimension", parentId: "org_enablement", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_policy_01", "en_policy_02", "en_policy_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "enablement_knowledge_learning", name: { he: "ידע ולמידה", en: "Knowledge & Learning" }, kind: "scale_mean", group: "enablement_dimension", parentId: "org_enablement", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_know_01", "en_know_02", "en_know_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "enablement_culture", name: { he: "תרבות", en: "Culture" }, kind: "scale_mean", group: "enablement_dimension", parentId: "org_enablement", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_cult_01", "en_cult_02", "en_cult_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "enablement_strategy", name: { he: "אסטרטגיה", en: "Strategy" }, kind: "scale_mean", group: "enablement_dimension", parentId: "org_enablement", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["en_strat_01", "en_strat_02", "en_strat_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  // ---- agentic management dimensions (never collapsed by default)
  { id: "agentic_manage_self", name: { he: "ניהול עצמי", en: "Manage Self" }, kind: "scale_mean", group: "agentic_management_dimension", parentId: "agentic_management", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["am_self_01", "am_self_02", "am_self_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "managers" },
  { id: "agentic_manage_humans", name: { he: "ניהול אנשים", en: "Manage Humans" }, kind: "scale_mean", group: "agentic_management_dimension", parentId: "agentic_management", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["am_humans_01", "am_humans_02", "am_humans_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "managers" },
  { id: "agentic_manage_ai", name: { he: "ניהול AI", en: "Manage AI" }, kind: "scale_mean", group: "agentic_management_dimension", parentId: "agentic_management", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["am_ai_01", "am_ai_02", "am_ai_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "managers" },
  { id: "agentic_manage_systems", name: { he: "ניהול מערכות אדם–AI", en: "Manage Human–AI Systems" }, kind: "scale_mean", group: "agentic_management_dimension", parentId: "agentic_management", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["am_sys_01", "am_sys_02", "am_sys_03"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "managers" },
  // ---- manager–team pairs
  { id: "gap_ai_clarity", name: { he: "בהירות ציפיות", en: "AI clarity" }, kind: "scale_mean", group: "manager_team_pair", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["mg_clarity", "mx_clarity"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all", pair: { managerItemId: "mg_clarity", employeeItemId: "mx_clarity" } },
  { id: "gap_experimentation", name: { he: "התנסות", en: "Experimentation" }, kind: "scale_mean", group: "manager_team_pair", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["mg_experiment", "mx_experiment"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all", pair: { managerItemId: "mg_experiment", employeeItemId: "mx_experiment" } },
  { id: "gap_verification", name: { he: "אימות", en: "Verification" }, kind: "scale_mean", group: "manager_team_pair", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["mg_verify", "mx_verify"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all", pair: { managerItemId: "mg_verify", employeeItemId: "mx_verify" } },
  { id: "gap_human_judgment", name: { he: "שיקול דעת אנושי", en: "Human judgment" }, kind: "scale_mean", group: "manager_team_pair", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["mg_judgment", "mx_judgment"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all", pair: { managerItemId: "mg_judgment", employeeItemId: "mx_judgment" } },
  // ---- adoption shares and breadth
  { id: "ai_daily_share", name: { he: "שימוש יומי", en: "Daily use" }, shortName: { he: "יומי", en: "Daily" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["ctx_ai_use_30d"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["daily"], coreProfile: false, audience: "all" },
  { id: "ai_nonuser_share", name: { he: "לא משתמשים", en: "Non-users" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["ctx_ai_use_30d"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["none"], coreProfile: false, audience: "all" },
  { id: "use_case_breadth", name: { he: "רוחב השימושים", en: "Use-case breadth" }, kind: "breadth", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 9, itemCanonicalIds: ["usecase_types"], reverseCodedIds: [], minAnsweredRatio: 1, coreProfile: false, audience: "all" },
  { id: "pattern_assist", name: { he: "סיוע", en: "Assist" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["work_patterns"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["assist"], coreProfile: false, audience: "all" },
  { id: "pattern_collaborate", name: { he: "שיתוף", en: "Collaborate" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["work_patterns"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["collaborate"], coreProfile: false, audience: "all" },
  { id: "pattern_delegate", name: { he: "האצלה", en: "Delegate" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["work_patterns"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["delegate"], coreProfile: false, audience: "all" },
  { id: "pattern_orchestrate", name: { he: "תזמור", en: "Orchestrate" }, kind: "share", group: "adoption", sourceType: "ngg_measure", scaleMin: 0, scaleMax: 100, itemCanonicalIds: ["work_patterns"], reverseCodedIds: [], minAnsweredRatio: 1, positiveValues: ["orchestrate"], coreProfile: false, audience: "all" },
  // ---- outcomes
  { id: "impact", name: { he: "השפעה ופריון", en: "Impact & Productivity" }, kind: "scale_mean", group: "impact", sourceType: "ngg_measure", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["imp_01", "imp_02", "imp_03", "imp_04"], reverseCodedIds: ["imp_04"], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
  { id: "trust_ai", name: { he: "אמון ב-AI", en: "Trust in AI" }, kind: "scale_mean", group: "impact", sourceType: "validated", scaleMin: 1, scaleMax: 5, itemCanonicalIds: ["trust_ai_01", "trust_ai_02", "trust_ai_03", "trust_ai_04"], reverseCodedIds: [], minAnsweredRatio: 0.5, coreProfile: false, audience: "all" },
];

/** Items whose answer distributions are shown on dashboards (barriers, work patterns, delegation map, usage). */
export const DISTRIBUTION_ITEMS = ["ctx_ai_use_30d", "work_patterns", "usecase_types", "barriers_main", "opp_areas", "dm_current", "dm_opportunity", "access_approved_tools"];

/** The default baseline template: recommended-core sections in order. */
export const BASELINE_TEMPLATE_SECTION_KEYS = [
  "org_context",
  "role_seniority",
  "ai_usage",
  "use_case_breadth",
  "gen_ai_literacy",
  "trust_in_ai",
  "agentic_work",
  "verification",
  "org_enablement",
  "manager_experience",
  "agentic_management",
  "delegation_map",
  "impact_productivity",
  "barriers",
  "opportunities",
  "open_questions",
];
