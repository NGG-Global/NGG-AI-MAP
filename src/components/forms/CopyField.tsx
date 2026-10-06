"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyField({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly value={value} dir="ltr" className="min-w-0 flex-1 rounded-[12px] border border-line bg-white px-3 py-2 text-[13px]" onFocus={(e) => e.currentTarget.select()} />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard unavailable: the field is selectable */
          }
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
