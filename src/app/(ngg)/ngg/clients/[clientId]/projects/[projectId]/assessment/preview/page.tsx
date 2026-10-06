import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { getQuestionnaireState } from "@/server/services/questionnaires";
import { PREVIEW_PERSONAS, type PreviewPersona } from "@/domain/questionnaire/logic";
import { QuestionnairePreview } from "@/components/survey/QuestionnairePreview";
import { TopBar } from "@/components/shell/TopBar";
import { Segmented } from "@/components/ui/Segmented";
import { notFound } from "next/navigation";
import { dirFor } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/assessment/preview">) {
  const { clientId, projectId } = await params;
  const sp = await searchParams;
  const { ctx, t } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const state = await getQuestionnaireState(ctx, projectId);
  if (!state) notFound();
  const version = (typeof sp.version === "string" ? state.versions.find((v) => v.id === sp.version) : undefined) ?? state.draft ?? state.versions[0]!;
  const personaKey = (typeof sp.persona === "string" && sp.persona in PREVIEW_PERSONAS ? sp.persona : "employee") as PreviewPersona;
  const surveyLocale = workspace.client.locale;
  const base = `/ngg/clients/${clientId}/projects/${projectId}/assessment`;
  const b = t.builder;
  return (
    <>
      <TopBar
        crumbs={[{ label: "NGG", href: "/ngg" }, { label: workspace.client.name, href: `/ngg/clients/${clientId}` }, { label: t.clientTabs.assessment, href: base }, { label: `${b.preview} · ${version.versionLabel}` }]}
        ariaLabel={t.nav.breadcrumb}
        actions={
          <Segmented
            ariaLabel={b.previewAs}
            value={personaKey}
            options={[
              { value: "employee", label: b.employee, href: `${base}/preview?version=${version.id}&persona=employee` },
              { value: "manager", label: b.manager, href: `${base}/preview?version=${version.id}&persona=manager` },
              { value: "non_ai_user", label: b.nonAiUser, href: `${base}/preview?version=${version.id}&persona=non_ai_user` },
            ]}
          />
        }
      />
      <div dir={dirFor(surveyLocale)} lang={surveyLocale} className="mx-auto w-full max-w-[720px]">
        <QuestionnairePreview definition={version.definition} persona={PREVIEW_PERSONAS[personaKey]} locale={surveyLocale} />
      </div>
    </>
  );
}
