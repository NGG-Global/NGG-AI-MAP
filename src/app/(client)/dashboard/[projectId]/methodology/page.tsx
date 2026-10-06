import { dashboardPage } from "@/server/ui/dashboard";
import { loadDashboardData } from "@/server/ui/dashboardData";
import { ClientShell } from "@/components/client/ClientShell";
import { Tile, TileTitle, InnerRow } from "@/components/ui/Tile";
import { SourceBadge } from "@/components/ui/StatusPill";
import { lt } from "@/domain/shared/localized";
import { fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MethodologyPage({ params, searchParams }: PageProps<"/dashboard/[projectId]/methodology">) {
  const { projectId } = await params;
  const sp = await searchParams;
  const d = await dashboardPage(projectId);
  const data = await loadDashboardData(d, sp);
  const { t, locale } = d;
  const m = t.dashboard.methodology;
  const def = data.definition;
  const sections = def?.sections ?? [];
  const bySource = (src: "validated" | "ngg_measure" | "client_custom") => sections.filter((s) => s.sourceType === src);
  const closed = data.waves.filter((w) => w.status === "closed");
  return (
    <ClientShell client={d.client} project={d.project} projects={data.projects} active="methodology" t={t} locale={locale} dir={d.dir} isNggPreview={d.isNggPreview} userName={d.ctx.user.name}>
      <Tile padding="hero">
        <h1 className="text-[30px] font-extrabold leading-tight md:text-[36px]">{m.title}</h1>
        <p className="mt-2 max-w-prose text-[15px] text-ink-2">{m.intro}</p>
      </Tile>
      <div className="flex flex-wrap gap-4">
        <Tile className="flex-[2_1_480px]">
          <TileTitle>{m.whatMeasured}</TileTitle>
          {(["validated", "ngg_measure", "client_custom"] as const).map((src) => {
            const list = bySource(src);
            if (!list.length) return null;
            return (
              <div key={src} className="mb-4">
                <div className="mb-1 flex items-center gap-2">
                  <SourceBadge sourceType={src} locale={locale} />
                  <p className="text-[14px] font-bold">{src === "validated" ? m.validated : src === "ngg_measure" ? m.ngg : m.custom}</p>
                </div>
                <p className="mb-2 text-[12px] text-text-muted">{src === "validated" ? m.validatedHelp : src === "ngg_measure" ? m.nggHelp : m.customHelp}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {list.map((s) => (
                    <li key={s.id} className="rounded-full bg-sunken px-3 py-1 text-[12px]">{lt(s.title, locale)} · {fmt(m.items, { n: s.questions.length })}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Tile>
        <div className="flex flex-[1_1_320px] flex-col gap-4">
          <Tile>
            <TileTitle>{m.sample}</TileTitle>
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {closed.map((w) => <InnerRow as="li" key={w.id}>{fmt(m.sampleRow, { wave: w.code, n: w.counts.completed, dates: `${formatDate(w.startAt, locale)} – ${formatDate(w.closedAt ?? w.endAt, locale)}` })}</InnerRow>)}
              {closed.length === 0 ? <li className="text-text-muted">—</li> : null}
            </ul>
          </Tile>
          <Tile>
            <TileTitle>{m.threshold}</TileTitle>
            <p className="text-[13px] text-ink-2">{fmt(m.thresholdHelp, { n: d.client.privacyThreshold })}</p>
          </Tile>
          <Tile>
            <TileTitle>{m.scoring}</TileTitle>
            <p className="text-[13px] text-ink-2">{m.scoringHelp}</p>
          </Tile>
          <Tile>
            <TileTitle>{m.ai}</TileTitle>
            <p className="text-[13px] text-ink-2">{m.aiHelp}</p>
          </Tile>
          <Tile>
            <TileTitle>{m.limitations}</TileTitle>
            <p className="text-[13px] text-ink-2">{m.limitationsText}</p>
          </Tile>
        </div>
      </div>
    </ClientShell>
  );
}
