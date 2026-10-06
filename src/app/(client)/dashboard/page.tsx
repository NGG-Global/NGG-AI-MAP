import { resolveDashboardEntry } from "@/server/ui/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardEntry() {
  await resolveDashboardEntry();
  return null;
}
