import { and, eq, inArray } from "drizzle-orm";
import { Tile, TileTitle } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import { metricDefinitions, metricResults, waves } from "@/server/db/schema";
import { lt } from "@/domain/shared/localized";
import { formatScore } from "@/lib/format";
import { Delta } from "@/components/ui/Delta";
import { pickCurrentWave } from "@/server/services/portfolio";
import { LinkButton } from "@/components/ui/Button";
import type { ServiceContext } from "@/server/services/context";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/domain/shared/enums";
import { insights } from "@/server/db/schema";
import { desc } from "drizzle-orm";
import { InsightBadge, InsightView } from "@/components/insights/InsightView";
import Link from "next/link";

/**
 * Core-metric preview for the project overview. Reads cached engine output only (metric_results),
 * never raw responses. Shows an empty state until a wave has been computed.
 */
export async function ProjectResultsPreview({ ctx, projectId, clientId, t, locale, className }: { ctx: ServiceContext; projectId: string; clientId: string; t: Dictionary; locale: Locale; className?: string }) {
  const projectWaves = await ctx.db.select().from(waves).where(eq(waves.projectId, projectId));
  const current = pickCurrentWave(projectWaves.filter((w) => w.status === "closed" || w.status === "open"));
  const baseline = current?.baselineWaveId ? projectWaves.find((w) => w.id === current.baselineWaveId) : null;
  const defs = await ctx.db.select().from(metricDefinitions).orderBy(metricDefinitions.sortOrder);
  const core = defs.filter((d) => d.config.coreProfile);
  const waveIds = [current?.id, baseline?.id].filter((x): x is string => Boolean(x));
  const rows = waveIds.length
    ? await ctx.db
        .select()
        .from(metricResults)
        .where(and(inArray(metricResults.waveId, waveIds), eq(metricResults.segmentKey, "all"), inArray(metricResults.metricId, core.map((c) => c.id))))
    : [];
  const currentById = new Map(rows.filter((r) => r.waveId === current?.id).map((r) => [r.metricId, r]));
  const baselineById = new Map(rows.filter((r) => r.waveId === baseline?.id).map((r) => [r.metricId, r]));
  const [latestInsight] = current
    ? await ctx.db.select().from(insights).where(and(eq(insights.projectId, projectId), eq(insights.type, "executive_summary"), eq(insights.waveId, current.id))).orderBy(desc(insights.createdAt)).limit(1)
    : [];

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
    <Tile>
      <TileTitle trailing={current ? <span className="text-[12px] text-text-muted">{baseline ? `${current.code} ${locale === "he" ? "מול" : "vs"} ${baseline.code}` : current.code}</span> : undefined}>
        {t.projects.coreMetrics}
      </TileTitle>
      {!current || currentById.size === 0 ? (
        <EmptyState title={t.projects.noResultsYet} action={<LinkButton href={`/ngg/clients/${clientId}/projects/${projectId}/results`} variant="secondary" size="sm">{t.clientTabs.results}</LinkButton>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {core.map((def) => {
            const row = currentById.get(def.id);
            const base = baselineById.get(def.id);
            const score = row?.suppressed ? null : (row?.score ?? null);
            const delta = score != null && base && !base.suppressed && base.score != null ? score - base.score : null;
            const pct = score != null ? ((score - def.config.scaleMin) / (def.config.scaleMax - def.config.scaleMin)) * 100 : 0;
            return (
              <li key={def.id} className="grid grid-cols-[1.2fr_2fr_0.5fr_0.8fr] items-center gap-3 text-[13px]">
                <span className="font-semibold">{lt(def.config.name, locale)}</span>
                <span className="relative h-2 rounded-full bg-muted" aria-hidden="true">
                  <span className="absolute inset-y-0 start-0 rounded-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                </span>
                <span className="text-[15px] font-extrabold">{formatScore(score, locale)}</span>
                <Delta value={delta} locale={locale} notComparable={Boolean(baseline) && delta == null && score != null} />
              </li>
            );
          })}
        </ul>
      )}
    </Tile>
    {latestInsight ? (
      <Tile>
        <TileTitle trailing={<InsightBadge status={latestInsight.status} t={t} />}>{t.projects.keyInsights}</TileTitle>
        <InsightView insight={latestInsight} metrics={defs.map((d) => d.config)} locale={locale} t={t} compact />
        <Link href={`/ngg/clients/${clientId}/projects/${projectId}/insights/${latestInsight.id}`} className="mt-3 inline-block text-[13px] font-semibold">{t.insights.title} ←</Link>
      </Tile>
    ) : null}
    </div>
  );
}
