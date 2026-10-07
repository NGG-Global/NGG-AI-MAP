import type { LocalizedText } from "@/domain/shared/localized";
import type { SourceType } from "@/domain/shared/enums";

/* Kept apart from the library content so client components can import it without the full library. */

/** Methodology labels shown to client users (copy §21). */
export const METHODOLOGY_LABELS: Record<SourceType, { label: LocalizedText; tooltip: LocalizedText }> = {
  validated: {
    label: { he: "מבוסס על סולם מחקרי מתוקף", en: "Based on a validated research scale" },
    tooltip: {
      he: "המדד מבוסס על סולם שפורסם ועבר בדיקות פסיכומטריות בגרסת המקור. הגרסה העברית במערכת היא התאמה של NGG וטרם עברה תיקוף עצמאי מלא בעברית.",
      en: "Based on a published scale with psychometric validation in its source version. The Hebrew version is an NGG adaptation that has not yet undergone full independent validation in Hebrew.",
    },
  },
  ngg_measure: {
    label: { he: "מדד NGG מבוסס מחקר", en: "NGG research-informed measure" },
    tooltip: {
      he: "המדד פותח על ידי NGG על בסיס הספרות והמסגרת המקצועית של המוצר. הוא משמש לאבחון ולמעקב, אך אינו מוצג כסולם פסיכומטרי מתוקף.",
      en: "Developed by NGG from the literature and the product's professional framework. Used for diagnosis and tracking; not presented as a validated psychometric scale.",
    },
  },
  client_custom: {
    label: { he: "שאלה מותאמת ללקוח", en: "Client custom question" },
    tooltip: {
      he: "שאלה שנוספה לצורכי הפרויקט ואינה חלק ממדדי הליבה של המערכת, אלא אם הוגדר אחרת במפורש.",
      en: "Added for this project; not part of the platform's core metrics unless explicitly configured.",
    },
  },
};

export const HEBREW_ADAPTATION_NOTE: LocalizedText = {
  he: "מבוסס על סולם מתוקף; הגרסה העברית היא התאמה של NGG וטרם עברה תיקוף פסיכומטרי עצמאי.",
  en: "Based on a validated scale; the Hebrew version is an NGG adaptation that has not yet undergone independent psychometric validation.",
};
