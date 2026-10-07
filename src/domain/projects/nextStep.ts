import type { WaveStatus, WaveType } from "@/domain/shared/enums";

/**
 * The single "what do I do now" rule for a project, used by every screen of the NGG workspace so the
 * guidance never contradicts itself. Pure: callers pass the facts, this returns the step.
 *
 * Journey: project → baseline questionnaire → baseline wave → publish → collect → results (→ follow-up).
 */

export type NextStepKey =
  | "create_project"
  | "build_questionnaire"
  | "create_baseline_wave"
  | "publish_wave"
  | "wave_scheduled"
  | "collect_responses"
  | "review_results";

/** The page that performs the step; a page shows the step without a button when it already is that page. */
export type StepPage = "client" | "assessment" | "wave_new" | "wave" | "results";

export interface StepWave {
  id: string;
  code: string;
  type: WaveType;
  status: WaveStatus;
  startAt: Date | null;
  createdAt: Date;
}

export interface NextStepInput {
  hasProject: boolean;
  hasQuestionnaire: boolean;
  waves: StepWave[];
}

export interface NextStep {
  key: NextStepKey;
  /** 1-based position in the journey, for "step n of JOURNEY_STEPS". */
  position: number;
  page: StepPage;
  /** Path relative to the project base (`/ngg/clients/:c/projects/:p`); empty for client-level steps. */
  path: string;
  wave?: StepWave;
}

export const JOURNEY_STEPS = 6;

export function nextProjectStep(input: NextStepInput): NextStep {
  if (!input.hasProject) return { key: "create_project", position: 1, page: "client", path: "" };
  const ordered = [...input.waves].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  // A wave that is not closed is always the thing to act on.
  const active = [...ordered].reverse().find((w) => w.status !== "closed");
  if (active) {
    const path = `/waves/${active.id}`;
    if (active.status === "draft") return { key: "publish_wave", position: 4, page: "wave", path, wave: active };
    if (active.status === "scheduled") return { key: "wave_scheduled", position: 5, page: "wave", path, wave: active };
    return { key: "collect_responses", position: 5, page: "wave", path, wave: active };
  }
  const lastClosed = ordered[ordered.length - 1];
  if (lastClosed) return { key: "review_results", position: 6, page: "results", path: `/results?wave=${lastClosed.id}`, wave: lastClosed };
  if (!input.hasQuestionnaire) return { key: "build_questionnaire", position: 2, page: "assessment", path: "/assessment" };
  return { key: "create_baseline_wave", position: 3, page: "wave_new", path: "/waves/new?type=baseline" };
}
