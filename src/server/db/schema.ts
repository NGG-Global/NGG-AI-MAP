import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  APPROVAL_STATES,
  AUDIENCES,
  AUDIENCE_SCOPES,
  CLIENT_ROLES,
  CLIENT_STATUSES,
  DISTRIBUTION_MODES,
  GOAL_SCOPES,
  GOAL_SOURCES,
  GOAL_STATUSES,
  INSIGHT_STATUSES,
  INSIGHT_TYPES,
  LOCALES,
  NGG_ROLES,
  PRIVACY_MODES,
  PROJECT_STATUSES,
  QUESTION_TYPES,
  RESEARCH_MODES,
  RESEARCH_STATUSES,
  RESPONDENT_STATUSES,
  SECTION_CATEGORIES,
  SOURCE_TYPES,
  TARGET_DIRECTIONS,
  USER_KINDS,
  USER_STATUSES,
  VERSION_STATUSES,
  WAVE_STATUSES,
  WAVE_TYPES,
} from "@/domain/shared/enums";
import type { LocalizedText } from "@/domain/shared/localized";
import type { QuestionnaireDefinition } from "@/domain/questionnaire/definition";
import type { MetricConfig } from "@/domain/measurement/config";
import type { QuestionTemplateContent } from "@/domain/questionnaire/library";
import type { SegmentAttributes } from "@/domain/measurement/types";

/* ------------------------------------------------------------------ enums */

export const userKindEnum = pgEnum("user_kind", USER_KINDS);
export const nggRoleEnum = pgEnum("ngg_role", NGG_ROLES);
export const clientRoleEnum = pgEnum("client_role", CLIENT_ROLES);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
export const localeEnum = pgEnum("locale", LOCALES);
export const clientStatusEnum = pgEnum("client_status", CLIENT_STATUSES);
export const projectStatusEnum = pgEnum("project_status", PROJECT_STATUSES);
export const researchModeEnum = pgEnum("research_mode", RESEARCH_MODES);
export const sourceTypeEnum = pgEnum("source_type", SOURCE_TYPES);
export const researchStatusEnum = pgEnum("research_status", RESEARCH_STATUSES);
export const audienceEnum = pgEnum("audience", AUDIENCES);
export const questionTypeEnum = pgEnum("question_type", QUESTION_TYPES);
export const sectionCategoryEnum = pgEnum("section_category", SECTION_CATEGORIES);
export const versionStatusEnum = pgEnum("version_status", VERSION_STATUSES);
export const waveTypeEnum = pgEnum("wave_type", WAVE_TYPES);
export const waveStatusEnum = pgEnum("wave_status", WAVE_STATUSES);
export const distributionModeEnum = pgEnum("distribution_mode", DISTRIBUTION_MODES);
export const privacyModeEnum = pgEnum("privacy_mode", PRIVACY_MODES);
export const audienceScopeEnum = pgEnum("audience_scope", AUDIENCE_SCOPES);
export const respondentStatusEnum = pgEnum("respondent_status", RESPONDENT_STATUSES);
export const insightTypeEnum = pgEnum("insight_type", INSIGHT_TYPES);
export const insightStatusEnum = pgEnum("insight_status", INSIGHT_STATUSES);
export const goalStatusEnum = pgEnum("goal_status", GOAL_STATUSES);
export const goalSourceEnum = pgEnum("goal_source", GOAL_SOURCES);
export const approvalStateEnum = pgEnum("approval_state", APPROVAL_STATES);
export const targetDirectionEnum = pgEnum("target_direction", TARGET_DIRECTIONS);
export const goalScopeEnum = pgEnum("goal_scope", GOAL_SCOPES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ------------------------------------------------------------- workspace */

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ...timestamps,
});

/* ----------------------------------------------------------------- users */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    kind: userKindEnum("kind").notNull(),
    nggRole: nggRoleEnum("ngg_role"),
    clientRole: clientRoleEnum("client_role"),
    /** Client users belong to exactly one client. NGG users have null. */
    clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull().default("he"),
    status: userStatusEnum("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), index("users_client_idx").on(t.clientId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** One-time password reset links, issued by an administrator (no email delivery in V1). */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    /** SHA-256 of the clear token; the clear token is shown once to the issuer. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

/** Fixed-window counters for rate limiting (keys hold hashes, never raw IPs or emails). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
}
);

/* --------------------------------------------------------------- clients */

export interface ClientBranding {
  primaryColor?: string;
  logoText?: string;
  logoUrl?: string;
}

export interface SegmentTaxonomy {
  departments: string[];
  roleFamilies: string[];
  seniorityGroups: string[];
  locations: string[];
}

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    industry: text("industry"),
    organizationSize: integer("organization_size"),
    locale: localeEnum("locale").notNull().default("he"),
    branding: jsonb("branding").$type<ClientBranding>().notNull().default({}),
    segmentTaxonomy: jsonb("segment_taxonomy")
      .$type<SegmentTaxonomy>()
      .notNull()
      .default({ departments: [], roleFamilies: [], seniorityGroups: [], locations: [] }),
    privacyThreshold: integer("privacy_threshold").notNull().default(7),
    allowClientInvites: boolean("allow_client_invites").notNull().default(false),
    retentionDays: integer("retention_days").notNull().default(730),
    surveyContact: text("survey_contact"),
    status: clientStatusEnum("status").notNull().default("active"),
    /** The NGG user who created the client; keeps access to it before any project exists. */
    createdByUserId: text("created_by_user_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("clients_slug_idx").on(t.workspaceId, t.slug)],
);

/* -------------------------------------------------------------- projects */

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: projectStatusEnum("status").notNull().default("setup"),
    managerUserId: text("manager_user_id").references(() => users.id),
    researchMode: researchModeEnum("research_mode").notNull().default("research_safe"),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("projects_client_idx").on(t.clientId)],
);

/** NGG project managers / analysts assigned to a project. */
export const projectAssignments = pgTable(
  "project_assignments",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

/** Optional restriction of a client user to specific projects of their client. */
export const clientUserProjectAccess = pgTable(
  "client_user_project_access",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectId] })],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    clientRole: clientRoleEnum("client_role").notNull(),
    projectIds: jsonb("project_ids").$type<string[]>().notNull().default([]),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invitations_token_idx").on(t.tokenHash), index("invitations_client_idx").on(t.clientId)],
);

/* --------------------------------------------------------------- library */

export const sectionTemplates = pgTable("section_templates", {
  id: text("id").primaryKey(),
  /** Stable key used in questionnaire definitions, e.g. `SECTION_GAIL_17`. */
  key: text("key").notNull().unique(),
  version: text("version").notNull().default("1.0"),
  category: sectionCategoryEnum("category").notNull(),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  description: jsonb("description").$type<LocalizedText>().notNull(),
  /** Respondent-facing introduction (may contain piped values) and its unpiped fallback. */
  intro: jsonb("intro").$type<LocalizedText>(),
  fallbackIntro: jsonb("fallback_intro").$type<LocalizedText>(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  researchStatus: researchStatusEnum("research_status").notNull(),
  audience: audienceEnum("audience").notNull().default("all"),
  /** False for optional sections (open text, delegation map). */
  required: boolean("required").notNull().default(true),
  recommendedCore: boolean("recommended_core").notNull().default(false),
  longitudinalCore: boolean("longitudinal_core").notNull().default(false),
  mandatory: boolean("mandatory").notNull().default(false),
  sourceReference: text("source_reference"),
  displayRules: jsonb("display_rules").$type<import("@/domain/questionnaire/definition").DisplayRule[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const questionTemplates = pgTable(
  "question_templates",
  {
    id: text("id").primaryKey(),
    /** Stable identifier preserved across versions, e.g. `GAIL_PE_01`. */
    canonicalId: text("canonical_id").notNull().unique(),
    sectionKey: text("section_key")
      .notNull()
      .references(() => sectionTemplates.key),
    version: text("version").notNull().default("1.0"),
    type: questionTypeEnum("type").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    locked: boolean("locked").notNull().default(false),
    content: jsonb("content").$type<QuestionTemplateContent>().notNull(),
    metricId: text("metric_id"),
    reverseCoded: boolean("reverse_coded").notNull().default(false),
    audience: audienceEnum("audience"),
    required: boolean("required").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("question_templates_section_idx").on(t.sectionKey)],
);

export const metricDefinitions = pgTable("metric_definitions", {
  id: text("id").primaryKey(),
  config: jsonb("config").$type<MetricConfig>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Small key/value store for platform state, e.g. the content hash of the loaded library. */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------- questionnaires */

export const questionnaires = pgTable(
  "questionnaires",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (t) => [index("questionnaires_project_idx").on(t.projectId)],
);

export const questionnaireVersions = pgTable(
  "questionnaire_versions",
  {
    id: text("id").primaryKey(),
    questionnaireId: text("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, { onDelete: "cascade" }),
    /** Human version label: 1.0, 1.1, 2.0 … */
    versionLabel: text("version_label").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: versionStatusEnum("status").notNull().default("draft"),
    definition: jsonb("definition").$type<QuestionnaireDefinition>().notNull(),
    basedOnVersionId: text("based_on_version_id"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    /** Set when a wave is published with this version; the definition is immutable afterwards. */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("qv_number_idx").on(t.questionnaireId, t.versionNumber)],
);

/* ----------------------------------------------------------------- waves */

export interface WaveAudienceConfig {
  scope: import("@/domain/shared/enums").AudienceScope;
  units?: string[];
  note?: string;
}

export const waves = pgTable(
  "waves",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // T0, T1, T2
    name: text("name").notNull(),
    type: waveTypeEnum("type").notNull(),
    status: waveStatusEnum("status").notNull().default("draft"),
    questionnaireVersionId: text("questionnaire_version_id").references(() => questionnaireVersions.id),
    baselineWaveId: text("baseline_wave_id"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    audience: jsonb("audience").$type<WaveAudienceConfig>().notNull().default({ scope: "all_organization" }),
    distributionMode: distributionModeEnum("distribution_mode").notNull().default("public_link"),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("anonymous"),
    /** Public survey token for `public_link` distribution. */
    publicToken: text("public_token"),
    invitedCount: integer("invited_count").notNull().default(0),
    locale: localeEnum("locale").notNull().default("he"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("waves_project_idx").on(t.projectId),
    uniqueIndex("waves_code_idx").on(t.projectId, t.code),
    uniqueIndex("waves_public_token_idx").on(t.publicToken),
  ],
);

/* ------------------------------------------------------------ respondents */

export const respondents = pgTable(
  "respondents",
  {
    id: text("id").primaryKey(),
    waveId: text("wave_id")
      .notNull()
      .references(() => waves.id, { onDelete: "cascade" }),
    /** Hash of the per-respondent access token (unique-token distribution or public-link session). */
    tokenHash: text("token_hash").notNull(),
    /** Pseudonymous identifier for longitudinal linking; null in anonymous mode. */
    pseudoIdentifier: text("pseudo_identifier"),
    segmentAttributes: jsonb("segment_attributes").$type<SegmentAttributes>().notNull().default({}),
    status: respondentStatusEnum("status").notNull().default("invited"),
    currentSectionIndex: integer("current_section_index").notNull().default(0),
    locale: localeEnum("locale").notNull().default("he"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("respondents_token_idx").on(t.tokenHash), index("respondents_wave_idx").on(t.waveId)],
);

export type ResponseValue = number | string | string[] | Record<string, number> | null;

export const responses = pgTable(
  "responses",
  {
    id: text("id").primaryKey(),
    respondentId: text("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),
    waveId: text("wave_id")
      .notNull()
      .references(() => waves.id, { onDelete: "cascade" }),
    questionCanonicalId: text("question_canonical_id").notNull(),
    questionVersion: text("question_version").notNull(),
    /** `null` means "prefer not to answer". */
    value: jsonb("value").$type<ResponseValue>(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("responses_respondent_question_idx").on(t.respondentId, t.questionCanonicalId),
    index("responses_wave_idx").on(t.waveId),
  ],
);

/** Pseudonymous longitudinal mapping, kept apart from responses (spec §39). */
export const identityMap = pgTable(
  "identity_map",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    emailHash: text("email_hash").notNull(),
    respondentHash: text("respondent_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("identity_map_project_email_idx").on(t.projectId, t.emailHash)],
);

/* --------------------------------------------------------- metric results */

export const metricResults = pgTable(
  "metric_results",
  {
    id: text("id").primaryKey(),
    waveId: text("wave_id")
      .notNull()
      .references(() => waves.id, { onDelete: "cascade" }),
    metricId: text("metric_id").notNull(),
    segmentKey: text("segment_key").notNull().default("all"),
    segmentValue: text("segment_value").notNull().default("all"),
    score: real("score"),
    n: integer("n").notNull(),
    itemCount: integer("item_count").notNull(),
    suppressed: boolean("suppressed").notNull().default(false),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("metric_results_unique_idx").on(t.waveId, t.metricId, t.segmentKey, t.segmentValue)],
);

/** Answer distributions for choice/matrix items (barriers, work patterns, delegation map), aggregated and suppressed. */
export const distributionResults = pgTable(
  "distribution_results",
  {
    id: text("id").primaryKey(),
    waveId: text("wave_id")
      .notNull()
      .references(() => waves.id, { onDelete: "cascade" }),
    itemCanonicalId: text("item_canonical_id").notNull(),
    segmentKey: text("segment_key").notNull().default("all"),
    segmentValue: text("segment_value").notNull().default("all"),
    /** option value (or `row|column` for matrix items) → share of respondents (0–100). */
    buckets: jsonb("buckets").$type<Record<string, number>>().notNull(),
    n: integer("n").notNull(),
    suppressed: boolean("suppressed").notNull().default(false),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("distribution_results_unique_idx").on(t.waveId, t.itemCanonicalId, t.segmentKey, t.segmentValue)],
);

/**
 * Cached, suppressed aggregates that need respondent-level data to compute (manager–team gaps and
 * per-item stats). Written when results are computed so dashboards never read `responses`.
 */
export const aggregateResults = pgTable(
  "aggregate_results",
  {
    id: text("id").primaryKey(),
    waveId: text("wave_id")
      .notNull()
      .references(() => waves.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"gap" | "item_stats">().notNull(),
    metricId: text("metric_id").notNull(),
    segmentKey: text("segment_key").notNull().default("all"),
    segmentValue: text("segment_value").notNull().default("all"),
    payload: jsonb("payload").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("aggregate_results_unique_idx").on(t.waveId, t.kind, t.metricId, t.segmentKey, t.segmentValue)],
);

/* --------------------------------------------------------------- insights */

export const insights = pgTable(
  "insights",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    waveId: text("wave_id").references(() => waves.id, { onDelete: "cascade" }),
    comparisonWaveId: text("comparison_wave_id"),
    type: insightTypeEnum("type").notNull(),
    status: insightStatusEnum("status").notNull().default("draft"),
    /** Structured, Zod-validated output. */
    payload: jsonb("payload").$type<unknown>().notNull(),
    /** Metric references the AI relied on. */
    evidence: jsonb("evidence").$type<import("@/domain/ai/contracts").EvidenceRef[]>().notNull().default([]),
    /** Sanitised, aggregated payload that was sent to the provider. */
    inputSnapshot: jsonb("input_snapshot").$type<unknown>().notNull(),
    validationWarnings: jsonb("validation_warnings").$type<string[]>().notNull().default([]),
    provider: text("provider").notNull(),
    model: text("model"),
    promptTemplate: text("prompt_template"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    ...timestamps,
  },
  (t) => [index("insights_project_idx").on(t.projectId), index("insights_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ goals */

export interface GoalBaselineEntry {
  metricId: string;
  waveId: string;
  waveCode: string;
  score: number | null;
  n: number;
}

export interface GoalAction {
  id: string;
  text: string;
  done: boolean;
}

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    ownerName: text("owner_name"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    scope: goalScopeEnum("scope").notNull().default("organization"),
    relatedMetricIds: jsonb("related_metric_ids").$type<string[]>().notNull().default([]),
    baseline: jsonb("baseline").$type<GoalBaselineEntry[]>().notNull().default([]),
    targetDirection: targetDirectionEnum("target_direction").notNull().default("increase"),
    targetValue: real("target_value"),
    actions: jsonb("actions").$type<GoalAction[]>().notNull().default([]),
    successEvidence: jsonb("success_evidence").$type<string[]>().notNull().default([]),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: goalStatusEnum("status").notNull().default("draft"),
    source: goalSourceEnum("source").notNull().default("human"),
    approvalState: approvalStateEnum("approval_state").notNull().default("pending"),
    approvedByUserId: text("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    sourceInsightId: text("source_insight_id"),
    publishedToClient: boolean("published_to_client").notNull().default(false),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [index("goals_project_idx").on(t.projectId)],
);

/* -------------------------------------------------------------- audit log */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    actorUserId: text("actor_user_id"),
    actorLabel: text("actor_label"),
    clientId: text("client_id"),
    projectId: text("project_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_client_idx").on(t.clientId), index("audit_logs_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------ row types */

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type SectionTemplate = typeof sectionTemplates.$inferSelect;
export type QuestionTemplate = typeof questionTemplates.$inferSelect;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type QuestionnaireVersion = typeof questionnaireVersions.$inferSelect;
export type Wave = typeof waves.$inferSelect;
export type Respondent = typeof respondents.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type MetricResult = typeof metricResults.$inferSelect;
export type DistributionResult = typeof distributionResults.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
