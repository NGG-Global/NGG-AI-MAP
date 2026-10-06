"use server";

import { redirect } from "next/navigation";
import { requireNggContext } from "@/server/auth/current";
import { createClient } from "@/server/services/clients";
import { field, runAction, type ActionState } from "@/server/ui/actions";

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireNggContext();
    const client = await createClient(ctx, {
      name: field(formData, "name"),
      slug: field(formData, "slug"),
      industry: field(formData, "industry"),
      organizationSize: field(formData, "organizationSize") ? Number(field(formData, "organizationSize")) : undefined,
      locale: field(formData, "locale") === "en" ? "en" : "he",
      surveyContact: field(formData, "surveyContact"),
      primaryColor: field(formData, "primaryColor"),
      logoText: field(formData, "logoText"),
    });
    redirect(`/ngg/clients/${client.id}`);
  });
}
