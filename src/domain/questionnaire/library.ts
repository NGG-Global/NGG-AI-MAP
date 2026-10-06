import type { ChoiceOption, DisplayRule, Scale } from "./definition";
import type { LocalizedText } from "@/domain/shared/localized";

/** Content column of a library question (`question_templates.content`). */
export interface QuestionTemplateContent {
  text: LocalizedText;
  helpText?: LocalizedText;
  options?: ChoiceOption[];
  scale?: Scale;
  matrixRows?: Array<{ key: string; label: LocalizedText }>;
  matrixColumns?: ChoiceOption[];
  displayRules?: DisplayRule[];
  allowPreferNotToAnswer?: boolean;
  wordingStatus?: "final" | "placeholder" | "illustrative";
}

export const LIKERT_5_LABELS: LocalizedText[] = [
  { he: "בכלל לא מסכים/ה", en: "Strongly disagree" },
  { he: "לא מסכים/ה", en: "Disagree" },
  { he: "במידה מסוימת", en: "Somewhat agree" },
  { he: "מסכים/ה", en: "Agree" },
  { he: "מסכים/ה מאוד", en: "Strongly agree" },
];

export const LIKERT_7_LABELS: LocalizedText[] = [
  { he: "בכלל לא", en: "Not at all" },
  { he: "במידה מועטה מאוד", en: "Very little" },
  { he: "במידה מועטה", en: "A little" },
  { he: "במידה בינונית", en: "Moderately" },
  { he: "במידה רבה", en: "Quite a lot" },
  { he: "במידה רבה מאוד", en: "Very much" },
  { he: "לחלוטין", en: "Completely" },
];

/** Approximate seconds per question type, used for the estimated completion time (spec §15). */
export const SECONDS_PER_QUESTION: Record<string, number> = {
  single_choice: 10,
  multi_select: 15,
  likert_5: 8,
  likert_7: 9,
  matrix: 25,
  numeric: 10,
  short_text: 25,
  long_text: 60,
};
