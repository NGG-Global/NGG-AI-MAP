import "server-only";
import { AppError } from "@/server/shared/errors";

/** Uniform result for server actions driven by `useActionState`. */
export type ActionState =
  | { ok: true; message?: string; data?: Record<string, string> }
  | { ok: false; error: string; fields?: string[]; /** Non-secret values to re-populate a form after an error. */ keep?: Record<string, string> }
  | null;

/** Converts thrown service errors into an action state instead of crashing the page. */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (error instanceof AppError) {
      return { ok: false, error: error.message, fields: "issues" in error ? (error as { issues: string[] }).issues : undefined };
    }
    console.error(error);
    return { ok: false, error: "unexpected" };
  }
}

function isNextRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_");
}

export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function fieldList(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((v): v is string => typeof v === "string" && v.length > 0);
}

export function commaList(formData: FormData, name: string): string[] {
  return field(formData, name)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
