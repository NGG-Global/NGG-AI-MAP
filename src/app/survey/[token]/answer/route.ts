import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db/client";
import { AnswerValidationError, saveAnswers } from "@/server/services/survey";
import { RateLimitError } from "@/server/security/rateLimit";
import { surveyPage } from "@/server/ui/survey";

/** Autosave endpoint: saves a single answer for the current respondent. */
export async function POST(request: NextRequest, context: RouteContext<"/survey/[token]/answer">) {
  const { token } = await context.params;
  const ctx = await surveyPage(token);
  if (!ctx.access || ctx.access.kind !== "respondent") return NextResponse.json({ ok: false }, { status: 403 });
  let body: { questionId?: string; value?: unknown };
  try {
    body = (await request.json()) as { questionId?: string; value?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.questionId || typeof body.questionId !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const { progress } = await saveAnswers(await db(), ctx.access, { [body.questionId]: body.value ?? null });
    return NextResponse.json({ ok: true, answered: progress.answeredCount, total: progress.totalCount });
  } catch (error) {
    if (error instanceof AnswerValidationError) return NextResponse.json({ ok: false, reason: error.reason }, { status: 422 });
    if (error instanceof RateLimitError) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } });
    throw error;
  }
}
