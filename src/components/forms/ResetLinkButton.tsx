"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import { CopyField } from "@/components/forms/CopyField";
import type { ActionState } from "@/server/ui/actions";

/** Issues a one-time password reset link and shows it once, for the administrator to pass on. */
export function ResetLinkButton({
  action,
  hidden,
  labels,
  locale,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden: Record<string, string>;
  labels: { button: string; help: string; copy: string; copied: string };
  locale: "he" | "en";
}) {
  const [state, run] = useActionState(action, null);
  const url = state?.ok ? state.data?.url : undefined;
  return (
    <div className="flex w-full flex-col gap-2">
      <form action={run}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton variant="secondary" size="sm">
          {labels.button}
        </SubmitButton>
      </form>
      {url ? (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] text-text-muted">{labels.help}</p>
          <CopyField value={url} copyLabel={labels.copy} copiedLabel={labels.copied} />
        </div>
      ) : state && !state.ok ? (
        <ActionNotice state={state} locale={locale} />
      ) : null}
    </div>
  );
}
