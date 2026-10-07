import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { clients, type Client, type SegmentTaxonomy } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { slugify } from "@/lib/format";
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

async function slugTaken(ctx: ServiceContext, slug: string, exceptClientId?: string): Promise<boolean> {
  const rows = await ctx.db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.workspaceId, ctx.actor.workspaceId), eq(clients.slug, slug)))
    .limit(1);
  return rows.some((r) => r.id !== exceptClientId);
}

/**
 * Resolves the short identifier. A typed value is normalised (case, spaces, Hebrew letters) rather
 * than rejected; an empty value is derived from the client name. A typed identifier that is already
 * used is reported, while a derived one receives a numeric suffix.
 */
async function resolveSlug(ctx: ServiceContext, typed: string, name: string, exceptClientId?: string): Promise<string> {
  const explicit = slugify(typed);
  if (explicit.length >= 2) {
    if (await slugTaken(ctx, explicit, exceptClientId)) throw new ConflictError("slug");
    return explicit;
  }
  if (typed.trim() && exceptClientId) throw new ValidationError("client", ["slug"]);
  const base = slugify(name).slice(0, 50);
  const stem = base.length >= 2 ? base : "client";
  for (let i = 1; i < 100; i += 1) {
    const candidate = i === 1 && base.length >= 2 ? stem : `${stem}-${i}`;
    if (!(await slugTaken(ctx, candidate, exceptClientId))) return candidate;
  }
  return `${stem}-${newId().slice(0, 8)}`;
}

export async function createClient(ctx: ServiceContext, input: ClientInput): Promise<Client> {
  assertWorkspace(ctx, "client.create");
  const name = (input.name ?? "").trim();
  const slug = await resolveSlug(ctx, input.slug ?? "", name);
  const parsed = clientInputSchema.safeParse({ ...input, slug });
  if (!parsed.success) throw new ValidationError("client", parsed.error.issues.map((i) => i.path.join(".")));
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
      createdByUserId: ctx.actor.userId,
    })
    .returning();
  await recordAudit(ctx, { action: "client.created", entityType: "client", entityId: id, clientId: id });
  return created!;
}

export async function updateClientSettings(ctx: ServiceContext, clientId: string, input: ClientSettingsInput): Promise<Client> {
  const client = await requireClient(ctx, clientId, "client.update_settings");
  const slug = input.slug?.trim() ? await resolveSlug(ctx, input.slug, input.name ?? client.name, clientId) : client.slug;
  const parsed = clientSettingsSchema.safeParse({ ...input, slug });
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
