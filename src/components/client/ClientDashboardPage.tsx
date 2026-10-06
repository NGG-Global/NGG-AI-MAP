import type { ReactNode } from "react";
import { ClientShell, type ClientNavKey } from "./ClientShell";
import { DashboardHeader } from "./DashboardHeader";
import { Tile } from "@/components/ui/Tile";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardContext } from "@/server/ui/dashboard";
import type { DashboardData } from "@/server/ui/dashboardData";

/** Shell + header + "no results yet" state shared by all executive dashboard pages. */
export function ClientDashboardPage({ d, data, active, headline, headerExtra, showFilters = true, children }: { d: DashboardContext; data: DashboardData; active: ClientNavKey; headline?: ReactNode; headerExtra?: ReactNode; showFilters?: boolean; children: ReactNode }) {
  return (
    <ClientShell client={d.client} project={d.project} projects={data.projects} active={active} t={d.t} locale={d.locale} dir={d.dir} isNggPreview={d.isNggPreview} userName={d.ctx.user.name}>
      {data.view && data.selected ? (
        <>
          <DashboardHeader data={data} page={active} t={d.t} locale={d.locale} headline={headline} showFilters={showFilters}>
            {headerExtra}
          </DashboardHeader>
          {children}
        </>
      ) : (
        <Tile padding="hero">
          <EmptyState title={d.t.client.nav[active]} body={d.t.dashboard.headlineNoResults} />
        </Tile>
      )}
    </ClientShell>
  );
}
