import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { clients, type Client, type SegmentTaxonomy } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { ConflictError, ValidationError } from "@/server/shared/errors";
import { LOCALES, MIN_PRIVACY_THRESHOLD } from "@/domain/shared/enums";
import { canClient } from "@/domain/authz/policy";
import type { ServiceContext } from "./context";
import { assertWorkspace, requireClient, visibleClientIds } from "./access";
import { recordAudit } from "./audit";

const listSchema = z.array(z.string().trim().min(1)).max(100);

export const clientInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug"),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  organizationSize: z.coerce.number().int().positive().optional(),
  locale: z.enum(LOCALES).default("he"),
  surveyContact: z.string().trim().max(200).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal("")),
  logoText: z.string().trim().max(4).optional().or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientSettingsSchema = clientInputSchema.extend({
  departments: listSchema.default([]),
  roleFamilies: listSchema.default([]),
  seniorityGroups: listSchema.default([]),
  locations: listSchema.default([]),
  allowClientInvites: z.boolean().default(false),
});
export type ClientSettingsInput = z.infer<typeof clientSettingsSchema>;

export async function listClients(ctx: ServiceContext): Promise<Client[]> {
  const ids = visibleClientIds(ctx);
  if (ids && ids.length === 0) return [];
  return ctx.db
    .select()
    .from(clients)
    .where(ids ? and(eq(clients.workspaceId, ctx.actor.workspaceId), inArray(clients.id, ids)) : eq(clients.workspaceId, ctx.actor.workspaceId))
    .orderBy(asc(clients.name));
}

export async function getClient(ctx: ServiceContext, clientId: string): Promise<Client> {
  return requireClient(ctx, clientId, "client.view");
}

export async function createClient(ctx: ServiceContext, input: ClientInput): Promise<Client> {
  assertWorkspace(ctx, "client.create");
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("client", parsed.error.issues.map((i) => i.path.join(".")));
  const existing = await ctx.db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, ctx.actor.workspaceId), eq(clients.slug, parsed.data.slug)))
    .limit(1);
  if (existing.length) throw new ConflictError("slug");
  const id = newId();
  const [created] = await ctx.db
    .insert(clients)
    .values({
      id,
      workspaceId: ctx.actor.workspaceId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      industry: parsed.data.industry || null,
      organizationSize: parsed.data.organizationSize ?? null,
      locale: parsed.data.locale,
      surveyContact: parsed.data.surveyContact || null,
      branding: {
        primaryColor: parsed.data.primaryColor || undefined,
        logoText: parsed.data.logoText || parsed.data.name.slice(0, 1),
      },
    })
    .returning();
  await recordAudit(ctx, { action: "client.created", entityType: "client", entityId: id, clientId: id });
  return created!;
}

export async function updateClientSettings(ctx: ServiceContext, clientId: string, input: ClientSettingsInput): Promise<Client> {
  const client = await requireClient(ctx, clientId, "client.update_settings");
  const parsed = clientSettingsSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("client", parsed.error.issues.map((i) => i.path.join(".")));
  const taxonomy: SegmentTaxonomy = {
    departments: parsed.data.departments,
    roleFamilies: parsed.data.roleFamilies,
    seniorityGroups: parsed.data.seniorityGroups,
    locations: parsed.data.locations,
  };
  const [updated] = await ctx.db
    .update(clients)
    .set({
      name: parsed.data.name,
      slug: parsed.data.slug,
      industry: parsed.data.industry || null,
      organizationSize: parsed.data.organizationSize ?? null,
      locale: parsed.data.locale,
      surveyContact: parsed.data.surveyContact || null,
      allowClientInvites: parsed.data.allowClientInvites,
      branding: {
        ...client.branding,
        primaryColor: parsed.data.primaryColor || undefined,
        logoText: parsed.data.logoText || client.branding.logoText,
      },
      segmentTaxonomy: taxonomy,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();
  await recordAudit(ctx, { action: "client.settings_updated", entityType: "client", entityId: clientId, clientId });
  return updated!;
}

/** Privacy threshold is a system-level policy: only super admins may change it (spec §5.2). */
export async function updatePrivacyThreshold(ctx: ServiceContext, clientId: string, threshold: number): Promise<Client> {
  await requireClient(ctx, clientId, "client.update_privacy");
  if (!canClient(ctx.actor, "client.update_privacy", { clientId })) throw new ValidationError("privacy");
  if (!Number.isInteger(threshold) || threshold < MIN_PRIVACY_THRESHOLD || threshold > 50) {
    throw new ValidationError("threshold", ["privacyThreshold"]);
  }
  const [updated] = await ctx.db
    .update(clients)
    .set({ privacyThreshold: threshold, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();
  await recordAudit(ctx, {
    action: "client.privacy_threshold_updated",
    entityType: "client",
    entityId: clientId,
    clientId,
    metadata: { threshold },
  });
  return updated!;
}

export async function archiveClient(ctx: ServiceContext, clientId: string): Promise<void> {
  assertWorkspace(ctx, "client.delete");
  await requireClient(ctx, clientId, "client.view");
  await ctx.db.update(clients).set({ status: "archived", updatedAt: new Date() }).where(eq(clients.id, clientId));
  await recordAudit(ctx, { action: "client.archived", entityType: "client", entityId: clientId, clientId });
}
