import { Notice } from "@/components/ui/Notice";
import type { ActionState } from "@/server/ui/actions";

/** Renders the outcome of a server action. Error messages are looked up in a small map. */
export function ActionNotice({ state, messages, locale, fieldLabels }: { state: ActionState; messages?: Record<string, string>; locale: "he" | "en"; fieldLabels?: Record<string, string> }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? <Notice tone="success" role="status">{state.message}</Notice> : null;
  }
  const fallback = locale === "he" ? "לא הצלחנו להשלים את הפעולה. בדקו את השדות ונסו שוב." : "The action could not be completed. Check the fields and try again.";
  const text = messages?.[state.error] ?? fallback;
  return (
    <Notice tone="danger" role="alert">
      {text}
      {state.fields?.length ? <span className="ms-2 text-[12px] opacity-80">({state.fields.map((f) => fieldLabels?.[f] ?? f).join(", ")})</span> : null}
    </Notice>
  );
}
