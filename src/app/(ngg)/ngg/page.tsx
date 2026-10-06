import Link from "next/link";
import { nggPage } from "@/server/ui/page";
import { getPortfolioOverview, type AttentionItem } from "@/server/services/portfolio";
import { TopBar } from "@/components/shell/TopBar";
import { Headline } from "@/components/ui/Headline";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { Kpi } from "@/components/ui/Kpi";
import { LinkButton } from "@/components/ui/Button";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { Icons } from "@/components/shell/icons";
import { fmt, type Dictionary } from "@/lib/i18n";
import type { WaveStatus } from "@/domain/shared/enums";

export const dynamic = "force-dynamic";

const waveTone: Record<WaveStatus, PillTone> = { draft: "neutral", scheduled: "info", open: "success", closed: "neutral" };

export default async function PortfolioPage() {
  const { ctx, t, locale } = await nggPage();
  const overview = await getPortfolioOverview(ctx);
  const { kpis } = overview;
  const today = formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <TopBar crumbs={[{ label: "NGG" }, { label: t.nav.overview }]} ariaLabel={t.nav.breadcrumb} />

      <Tile padding="hero" className="flex flex-wrap items-end justify-between gap-4">
        <Headline eyebrow={today}>
          {kpis.requiringAttention > 0 ? fmt(t.portfolio.headline, { attention: kpis.requiringAttention, followUps: kpis.followUpsDue }) : t.portfolio.headlineQuiet}
        </Headline>
        <div className="flex gap-2">
          {ctx.actor.role !== "analyst" ? (
            <LinkButton href="/ngg/clients/new" variant="cta">
              <Icons.plus /> {t.portfolio.newClient}
            </LinkButton>
          ) : null}
        </div>
      </Tile>

      <div className="flex flex-wrap gap-4">
        <Tile tone="accent" className="flex flex-[1_1_240px] flex-col justify-between gap-6">
          <TileTitle className="mb-0">{t.portfolio.responsesThisMonth}</TileTitle>
          <span className="text-[64px] font-black leading-none tracking-tight">{formatNumber(kpis.responsesThisMonth, locale)}</span>
        </Tile>
        <Tile tone="ink" className="flex flex-[1_1_240px] flex-col justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold text-accent-on-dark">{t.portfolio.northStar}</p>
            <TileTitle className="mb-0">{t.portfolio.northStarLabel}</TileTitle>
          </div>
          <span className="text-[48px] font-black leading-none">{kpis.northStarPercent == null ? "—" : formatPercent(kpis.northStarPercent, locale)}</span>
        </Tile>
        <Tile className="grid flex-[2_1_360px] grid-cols-2 gap-6 md:grid-cols-4" aria-label={t.portfolio.portfolioTable}>
          <Kpi label={t.portfolio.activeClients} value={formatNumber(kpis.activeClients, locale)} />
          <Kpi label={t.portfolio.activeSurveys} value={formatNumber(kpis.activeSurveys, locale)} />
          <Kpi label={t.portfolio.followUpsDue} value={formatNumber(kpis.followUpsDue, locale)} />
          <Kpi label={t.portfolio.openGoals} value={formatNumber(kpis.openGoals, locale)} />
        </Tile>
      </div>

      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_520px]">
          <TileTitle>{t.portfolio.portfolioTable}</TileTitle>
          {overview.rows.length === 0 ? (
            <EmptyState title={t.portfolio.noClients} action={<LinkButton href="/ngg/clients/new" variant="cta">{t.portfolio.newClient}</LinkButton>} />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="hidden grid-cols-[2fr_0.6fr_1fr_0.8fr_1fr_0.8fr] gap-3 px-4 text-[12px] font-semibold text-text-muted md:grid">
                <span>{t.portfolio.colClient}</span>
                <span>{t.portfolio.colWave}</span>
                <span>{t.portfolio.colStatus}</span>
                <span>{t.portfolio.colResponseRate}</span>
                <span>{t.portfolio.colNextFollowUp}</span>
                <span>{t.portfolio.colAccess}</span>
              </div>
              {overview.rows.map((row) => {
                const href = `/ngg/clients/${row.client.id}/projects/${row.project.id}`;
                const status = row.currentWave ? t.waveStatus[row.currentWave.status] : t.projectStatus[row.project.status];
                const tone: PillTone = row.currentWave ? waveTone[row.currentWave.status] : "neutral";
                return (
                  <InnerRow key={row.project.id} className="grid grid-cols-1 items-center gap-3 md:grid-cols-[2fr_0.6fr_1fr_0.8fr_1fr_0.8fr]">
                    <div className="flex items-center gap-3">
                      <Avatar text={row.client.branding.logoText ?? row.client.name} color={row.client.branding.primaryColor} size="sm" />
                      <div className="min-w-0 leading-tight">
                        <Link href={href} className="block truncate text-[14px] font-bold text-ink no-underline hover:text-accent-text">
                          {row.client.name}
                          {row.client.industry ? <span className="font-normal text-text-muted"> · {row.client.industry}</span> : null}
                        </Link>
                        <span className="block truncate text-[12px] text-text-muted">
                          {row.project.name}
                          {row.managerName ? ` · ${row.managerName}` : ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-[15px] font-extrabold">{row.currentWave?.code ?? "—"}</span>
                    <StatusPill tone={row.pendingInsights > 0 ? "accent" : tone}>{row.pendingInsights > 0 ? t.portfolio.attentionInsightPending.replace(".", "") : status}</StatusPill>
                    <span className="text-[15px] font-extrabold">{row.responseRate == null ? "—" : formatPercent(row.responseRate, locale)}</span>
                    <span className="text-[13px] text-text-muted">{row.nextFollowUpAt ? formatDate(row.nextFollowUpAt, locale, { month: "short", year: "numeric" }) : t.common.notSet}</span>
                    <span className="text-[13px] text-text-muted">{row.dashboardUsers > 0 ? fmt(t.portfolio.accessActive, { n: row.dashboardUsers }) : t.portfolio.accessNone}</span>
                  </InnerRow>
                );
              })}
            </div>
          )}
        </Tile>

        <Tile className="flex-[1_1_300px]">
          <TileTitle trailing={<span className="text-[13px] font-bold text-text-muted">{overview.attention.length}</span>}>{t.portfolio.requiringAttention}</TileTitle>
          {overview.attention.length === 0 ? (
            <p className="text-[14px] text-text-muted">{t.portfolio.allGood}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview.attention.map((item) => (
                <AttentionRow key={`${item.projectId}-${item.kind}`} item={item} t={t} />
              ))}
            </ul>
          )}
        </Tile>
      </div>
    </>
  );
}

function AttentionRow({ item, t }: { item: AttentionItem; t: Dictionary }) {
  const base = `/ngg/clients/${item.clientId}/projects/${item.projectId}`;
  const map: Record<AttentionItem["kind"], { text: string; href: string; tone: PillTone; tag: string }> = {
    low_response: { text: fmt(t.portfolio.attentionLowResponse, { rate: item.value ?? 0 }), href: `${base}/waves`, tone: "danger", tag: "!" },
    wave_ending: { text: fmt(t.portfolio.attentionWaveEnding, { days: item.value ?? 0 }), href: `${base}/waves`, tone: "warning", tag: "⏱" },
    insight_pending: { text: t.portfolio.attentionInsightPending, href: `${base}/insights`, tone: "accent", tag: "AI" },
    follow_up_due: { text: t.portfolio.attentionFollowUpDue, href: `${base}/waves`, tone: "info", tag: "T+" },
    no_access: { text: t.portfolio.attentionNoAccess, href: `/ngg/clients/${item.clientId}/access`, tone: "neutral", tag: "👤" },
    draft: { text: t.portfolio.attentionDraft, href: `${base}/assessment`, tone: "neutral", tag: "✎" },
  };
  const entry = map[item.kind];
  return (
    <InnerRow as="li" className="flex items-start gap-3">
      <StatusPill tone={entry.tone} dot={false}>{entry.tag}</StatusPill>
      <div className="min-w-0 flex-1 text-[13px]">
        <p className="font-bold">{item.clientName}</p>
        <p className="text-text-muted">{entry.text}</p>
        <Link href={entry.href} className="text-[12px] font-semibold">
          {t.common.open} ←
        </Link>
      </div>
    </InnerRow>
  );
}
