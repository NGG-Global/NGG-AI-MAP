"use client";

import { useActionState } from "react";
import { createProjectAction, updateProjectAction } from "./actions";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ActionNotice } from "@/components/forms/ActionNotice";
import type { Dictionary } from "@/lib/i18n";
import type { Project } from "@/server/db/schema";

export interface ManagerOption {
  id: string;
  name: string;
}

export function ProjectForm({ t, locale, clientId, managers, project, defaultManagerId }: { t: Dictionary; locale: "he" | "en"; clientId: string; managers: ManagerOption[]; project?: Project; defaultManagerId?: string }) {
  const [state, action] = useActionState(project ? updateProjectAction : createProjectAction, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="clientId" value={clientId} />
      {project ? <input type="hidden" name="projectId" value={project.id} /> : null}
      <Field label={t.projects.name} htmlFor="projectName" className="md:col-span-2">
        <Input id="projectName" name="name" required minLength={2} defaultValue={project?.name ?? ""} />
      </Field>
      <Field label={t.projects.manager} htmlFor="managerUserId">
        <Select id="managerUserId" name="managerUserId" defaultValue={project?.managerUserId ?? (managers.some((m) => m.id === defaultManagerId) ? defaultManagerId : "")}>
          <option value="">—</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.projects.researchMode} htmlFor="researchMode" help={t.projects.researchSafeHelp}>
        <Select id="researchMode" name="researchMode" defaultValue={project?.researchMode ?? "research_safe"}>
          <option value="research_safe">{t.projects.research_safe}</option>
          <option value="flexible">{t.projects.flexible}</option>
        </Select>
      </Field>
      {project ? (
        <Field label={t.projects.status} htmlFor="status">
          <Select id="status" name="status" defaultValue={project.status}>
            {(["setup", "collecting", "analysis", "follow_up", "closed"] as const).map((s) => (
              <option key={s} value={s}>
                {t.projectStatus[s]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div className="md:col-span-2">
        <ActionNotice state={state} locale={locale} />
      </div>
      <div className="md:col-span-2">
        <SubmitButton variant={project ? "primary" : "cta"}>{project ? t.common.save : t.projects.newProject}</SubmitButton>
      </div>
    </form>
  );
}
