"use server";

import { revalidatePath } from "next/cache";
import { requireNggContext } from "@/server/auth/current";
import { computeWaveResults } from "@/server/services/results";
import { field } from "@/server/ui/actions";

export async function recomputeAction(formData: FormData): Promise<void> {
  const ctx = await requireNggContext();
  await computeWaveResults(ctx, field(formData, "waveId"));
  revalidatePath(`/ngg/clients/${field(formData, "clientId")}/projects/${field(formData, "projectId")}/results`);
}
