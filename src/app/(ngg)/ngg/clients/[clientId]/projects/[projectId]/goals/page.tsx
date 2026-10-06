import { nggPage } from "@/server/ui/page";
import { loadClientWorkspace } from "@/server/ui/workspace";
import { canProject } from "@/domain/authz/policy";
import { goalMeasurement, listGoals, canTransition } from "@/server/services/goals";
import { loadMetricConfigs } from "@/server/services/library";
import { ClientWorkspaceHeader } from "@/components/ngg/ClientWorkspaceHeader";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalCard } from "@/components/goals/GoalCard";
import { goalDecisionAction } from "./actions";
import { lt } from "@/domain/shared/localized";
import { GOAL_STATUSES } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

export default async function GoalsPage({ params }: PageProps<"/ngg/clients/[clientId]/projects/[projectId]/goals">) {
  const { clientId, projectId } = await params;
  const { ctx, t, locale } = await nggPage();
  const workspace = await loadClientWorkspace(ctx, clientId, projectId);
  const canCreate = canProject(ctx.actor, "goal.create", { clientId, projectId });
  const canApprove = canProject(ctx.actor, "goal.approve", { clientId, projectId });
  const [goals, metrics] = await Promise.all([listGoals(ctx, projectId), loadMetricConfigs(ctx.db)]);
  const measurements = await Promise.all(goals.map((g) => goalMeasurement(ctx, g)));
  const metricOptions = metrics.filter((m) => m.group !== "adoption" || m.id.startsWith("pattern_")).map((m) => ({ id: m.id, name: lt(m.name, locale) }));
  const g = t.goals;
  return (
    <>
      <ClientWorkspaceHeader workspace={workspace} active="goals" t={t} locale={locale} canManage={canCreate} />
      <Tile>
        <TileTitle trailing={canCreate ? <GoalForm t={t} locale={locale} clientId={clientId} projectId={projectId} metrics={metricOptions} /> : undefined}>{g.title}</TileTitle>
        <p className="mb-4 text-[12px] text-text-muted">{g.subtitle}</p>
        {goals.length === 0 ? (
          <EmptyState title={g.none} />
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((goal, index) => {
              const hidden = (
                <>
                  <input type="hidden" name="clientId" value={clientId} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="goalId" value={goal.id} />
                </>
              );
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  measurement={measurements[index]!}
                  metrics={metrics}
                  locale={locale}
                  t={t}
                  showInternal
                  actions={
                    canCreate ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        {canApprove && goal.approvalState === "pending" ? (
                          <>
                            <form action={goalDecisionAction}>{hidden}<input type="hidden" name="op" value="approve" /><Button type="submit" variant="cta" size="sm">{g.approve}</Button></form>
                            <form action={goalDecisionAction}>{hidden}<input type="hidden" name="op" value="reject" /><Button type="submit" variant="danger" size="sm">{g.reject}</Button></form>
                          </>
                        ) : null}
                        {canApprove && goal.approvalState === "approved" ? (
                          <form action={goalDecisionAction}>{hidden}<input type="hidden" name="op" value={goal.publishedToClient ? "unpublish" : "publish"} /><Button type="submit" variant="secondary" size="sm">{goal.publishedToClient ? g.unpublish : g.publishToClient}</Button></form>
                        ) : null}
                        {GOAL_STATUSES.filter((s) => canTransition(goal.status, s) && (s !== "active" || goal.approvalState === "approved")).map((s) => (
                          <form key={s} action={goalDecisionAction}>{hidden}<input type="hidden" name="op" value="status" /><input type="hidden" name="status" value={s} /><Button type="submit" variant="ghost" size="sm">{g.moveTo} {g.statuses[s]}</Button></form>
                        ))}
                        {goal.actions.map((a) => (
                          <form key={a.id} action={goalDecisionAction}>{hidden}<input type="hidden" name="op" value="toggle_action" /><input type="hidden" name="actionId" value={a.id} /><input type="hidden" name="done" value={a.done ? "0" : "1"} /><Button type="submit" variant="ghost" size="sm">{a.done ? "○" : "✓"} {a.text.slice(0, 24)}</Button></form>
                        ))}
                        <GoalForm t={t} locale={locale} clientId={clientId} projectId={projectId} metrics={metricOptions} goal={goal} />
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </Tile>
    </>
  );
}
