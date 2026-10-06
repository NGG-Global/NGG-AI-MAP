import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/current";

export default async function RootPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  redirect(ctx.actor.kind === "ngg" ? "/ngg" : "/dashboard");
}
