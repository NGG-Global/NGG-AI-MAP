import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { getBaselineDefinition, getQuestionnaireState } from "@/server/services/questionnaires";
import { listLibrary, loadMetricConfigs } from "@/server/services/library";
import { computeComparability, removedSections, summarizeQuestionnaire } from "@/domain/questionnaire/logic";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button, LinkButton } from "@/components/ui/Button";
import { SummaryPanel } from "@/components/builder/SummaryPanel";
import { LibraryPanel } from "@/components/builder/LibraryPanel";
import { SectionCard } from "@/components/builder/SectionCard";
import { SectionConfigPanel, type SectionComparabilityInfo } from "@/components/builder/SectionConfigPanel";
import { IntroForm } from "@/components/builder/IntroForm";
import { CreateBaselineForm } from "./CreateBaselineForm";
import { addCustomSectionAction, addSectionAction, createNextVersionAction } from "./actions";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { Icons } from "@/components/shell/icons";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({ params, searchParams }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/assessment">) {
  const { clientId, projectId } = await params;
  const sp = await searchParams;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const project = workspace.project!;
  const canEdit = canProject(ctx.actor, "questionnaire.edit", { clientId, projectId });
  const state = await getQuestionnaireState(ctx, projectId);
  const b = t.builder;
  const base = `/ngg/clients/${clientId}/projects/${projectId}/assessment`;

  if (!state) {
    return (
      <>
        <ClientWorkspaceHeader workspace={workspace} active="assessment" t={t} locale={locale} canManage={canEdit} />
        <Tile padding="hero">
          <TileTitle>{t.clients.emptyTitle}</TileTitle>
          {canEdit ? <CreateBaselineForm clientId={clientId} projectId={projectId} defaultName={`${project.name} — Baseline`} t={t} locale={locale} /> : <EmptyState title={t.clients.emptyTitle} body={t.clients.emptyBody} />}
        </Tile>
      </>
    );
  }

  const requestedVersion = typeof sp.version === "string" ? state.versions.find((v) => v.id === sp.version) : undefined;
  const version = requestedVersion ?? state.draft ?? state.versions[0]!;
  const editable = canEdit && !version.lockedAt;
  const definition = version.definition;
  const [library, metrics, baseline] = await Promise.all([listLibrary(ctx), loadMetricConfigs(ctx.db), getBaselineDefinition(ctx, projectId)]);
  const summary = summarizeQuestionnaire(definition);
  const comparability = baseline ? computeComparability(baseline.definition, definition, metrics) : null;
  const removed = baseline ? removedSections(baseline.definition, definition) : [];
  const usedKeys = new Set(definition.sections.map((s) => s.key));
  const baselineKeys = new Set(baseline?.definition.sections.map((s) => s.key) ?? []);
  const selectedId = typeof sp.section === "string" ? sp.section : definition.sections[0]?.id;
  const selectedIndex = definition.sections.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? definition.sections[selectedIndex]! : null;
  // Rule values come from the questions in this definition, so they always match what respondents can answer.
  const valueOptions: Record<string, string[]> = Object.fromEntries(
    definition.sections.flatMap((s) => s.questions).filter((q) => q.options?.length).map((q) => [`q:${q.canonicalId}`, q.options!.map((o) => o.value)]),
  );
  const sectionComparability = (key: string): SectionComparabilityInfo => {
    if (!baseline) return { level: "new" as const, baselineCode: null };
    if (!baselineKeys.has(key)) return { level: "new" as const, baselineCode: baseline.waveCode };
    const section = definition.sections.find((s) => s.key === key)!;
    const ids = section.questions.filter((q) => q.sourceType !== "client_custom").map((q) => q.metricId).filter((x): x is string => Boolean(x));
    const rows = comparability!.metrics.filter((m) => ids.includes(m.metricId));
    const level: SectionComparabilityInfo["level"] = rows.length === 0 ? "full" : rows.every((r) => r.level === "full") ? "full" : rows.every((r) => r.level === "none") ? "none" : "partial";
    return { level, baselineCode: baseline.waveCode };
  };

  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="assessment" t={t} locale={locale} canManage={canEdit} />

      <Tile className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-text-muted">{b.title}</p>
          <h2 className="text-[22px] font-extrabold leading-tight">{lt(definition.title, locale)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
            <StatusPill tone={version.lockedAt ? "info" : "accent"}>
              {b.version} {version.versionLabel} · {version.lockedAt ? b.lockedBy : b.draft}
            </StatusPill>
            <StatusPill tone={project.researchMode === "research_safe" ? "success" : "warning"} dot={false}>
              <Icons.shield width={12} height={12} /> {project.researchMode === "research_safe" ? b.researchSafe : b.flexible}
            </StatusPill>
            {state.versions.length > 1 ? (
              <span className="flex flex-wrap items-center gap-1">
                {b.versionHistory}:
                {state.versions.map((v) => (
                  <Link key={v.id} href={`${base}?version=${v.id}`} className={v.id === version.id ? "font-bold text-ink" : ""}>
                    {v.versionLabel}
                  </Link>
                ))}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`${base}/preview?version=${version.id}&persona=employee`} variant="secondary" size="sm">
            {b.preview}: {b.employee}
          </LinkButton>
          <LinkButton href={`${base}/preview?version=${version.id}&persona=manager`} variant="secondary" size="sm">
            {b.preview}: {b.manager}
          </LinkButton>
          <LinkButton href={`${base}/preview?version=${version.id}&persona=non_ai_user`} variant="secondary" size="sm">
            {b.preview}: {b.nonAiUser}
          </LinkButton>
          {canEdit && version.lockedAt && !state.draft ? (
            <form action={createNextVersionAction}>
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="versionId" value={version.id} />
              <Button type="submit" variant="primary" size="sm" title={b.newVersionHelp}>
                {b.newVersion}
              </Button>
            </form>
          ) : null}
        </div>
      </Tile>

      <SummaryPanel summary={summary} comparability={comparability} baselineCode={baseline?.waveCode ?? null} t={t} />

      {summary.placeholderWordingItems > 0 ? <Notice tone="warning">{fmt(b.placeholderWordingHelp, { n: summary.placeholderWordingItems })}</Notice> : null}
      {comparability && comparability.affectedMetricIds.length > 0 ? (
        <Notice tone="warning" role="status">
          {fmt(b.comparabilityWarning, { n: comparability.affectedMetricIds.length, wave: baseline!.waveCode })}
          <span className="ms-2 text-[12px]" dir="ltr">
            ({comparability.affectedMetricIds.join(", ")})
          </span>
        </Notice>
      ) : null}
      {removed.map((section) => (
        <Notice key={section.key} tone="warning">
          <div className="flex flex-wrap items-center gap-3">
            <span>{fmt(b.removedSinceBaseline, { section: lt(section.title, locale), wave: baseline!.waveCode })}</span>
            {editable && !section.key.startsWith("custom:") ? (
              <form action={addSectionAction}>
                <input type="hidden" name="clientId" value={clientId} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="versionId" value={version.id} />
                <input type="hidden" name="sectionKey" value={section.key} />
                <Button type="submit" variant="secondary" size="sm">
                  {b.restoreSection}
                </Button>
              </form>
            ) : null}
          </div>
        </Notice>
      ))}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-[1_1_260px] md:max-w-[320px]">
          <LibraryPanel library={library} usedKeys={usedKeys} baselineKeys={baselineKeys} versionId={version.id} clientId={clientId} projectId={projectId} editable={editable} t={t} locale={locale} />
        </div>
        <Tile className="flex-[2_1_480px]">
          <TileTitle
            trailing={
              editable ? (
                <form action={addCustomSectionAction} className="flex items-center gap-2">
                  <input type="hidden" name="clientId" value={clientId} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {b.addCustomSection}
                  </Button>
                </form>
              ) : undefined
            }
          >
            {b.structure}
          </TileTitle>
          <div className="mb-3">
            <IntroForm definition={definition} versionId={version.id} clientId={clientId} projectId={projectId} editable={editable} t={t} locale={locale} />
          </div>
          <ol className="flex flex-col gap-3">
            {definition.sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                total={definition.sections.length}
                selected={section.id === selected?.id}
                versionId={version.id}
                clientId={clientId}
                projectId={projectId}
                editable={editable}
                selectHref={`${base}?version=${version.id}&section=${section.id}`}
                t={t}
                locale={locale}
              />
            ))}
          </ol>
        </Tile>
        <Tile as="aside" className="flex-[1_1_280px] md:max-w-[360px]">
          {selected ? (
            <SectionConfigPanel
              key={selected.id}
              section={selected}
              index={selectedIndex}
              versionId={version.id}
              clientId={clientId}
              projectId={projectId}
              editable={editable}
              comparability={sectionComparability(selected.key)}
              valueOptions={valueOptions}
              t={t}
              locale={locale}
            />
          ) : (
            <p className="text-[13px] text-text-muted">{b.selectSection}</p>
          )}
        </Tile>
      </div>

      <p className="px-2 text-[12px] text-text-muted">
        {b.createdBy}: {formatDateTime(version.createdAt, locale)} · {t.common.updated}: {formatDateTime(version.updatedAt, locale)}
      </p>
    </>
  );
}
