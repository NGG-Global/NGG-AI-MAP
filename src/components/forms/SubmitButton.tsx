"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

export function SubmitButton({ children, pendingLabel, ...rest }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...rest}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
