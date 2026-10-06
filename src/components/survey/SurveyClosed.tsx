import { NggLogo } from "@/components/shell/NggLogo";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import type { SurveyClosedReason } from "@/server/services/survey";

export function SurveyClosed({ reason, t, locale, dir }: { reason: SurveyClosedReason; t: Dictionary["survey"]; locale: Locale; dir: "rtl" | "ltr" }) {
  const completed = reason === "completed";
  return (
    <div dir={dir} lang={locale} className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-4 p-4">
      <header className="flex justify-end"><NggLogo compact /></header>
      <main className="rounded-[32px] bg-surface p-7">
        <h1 className="text-[28px] font-black">{completed ? t.completedTitle : t.closedTitle}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{completed ? t.completedBody : t.closedBody}</p>
      </main>
    </div>
  );
}
