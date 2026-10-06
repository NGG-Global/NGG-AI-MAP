"use client";

import { Tile } from "@/components/ui/Tile";
import { Button } from "@/components/ui/Button";

export default function NggError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Tile role="alert" className="flex flex-col items-start gap-3" as="div">
      <h1 className="text-[22px] font-extrabold">משהו השתבש · Something went wrong</h1>
      <p className="text-[14px] text-text-muted">{error.message || "Unexpected error"}</p>
      <Button onClick={reset} variant="secondary">
        ניסיון חוזר · Retry
      </Button>
    </Tile>
  );
}
