/**
 * Canonical enumerations shared by the database schema, the domain logic and the UI.
 * Keep these as `const` tuples so Drizzle `pgEnum` and Zod can both derive from them.
 */

export const USER_KINDS = ["ngg", "client"] as const;
export type UserKind = (typeof USER_KINDS)[number];

export const NGG_ROLES = ["super_admin", "project_manager", "analyst"] as const;
export type NggRole = (typeof NGG_ROLES)[number];

export const CLIENT_ROLES = ["admin", "viewer"] as const;
export type ClientRole = (typeof CLIENT_ROLES)[number];

export const USER_STATUSES = ["active", "invited", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const LOCALES = ["he", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CLIENT_STATUSES = ["active", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const PROJECT_STATUSES = ["setup", "collecting", "analysis", "follow_up", "closed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const RESEARCH_MODES = ["research_safe", "flexible"] as const;
export type ResearchMode = (typeof RESEARCH_MODES)[number];

export const SOURCE_TYPES = ["validated", "ngg_measure", "client_custom"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const RESEARCH_STATUSES = ["validated", "ngg_measure", "experimental", "custom"] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const AUDIENCES = ["all", "managers", "employees"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const QUESTION_TYPES = [
  "single_choice",
  "multi_select",
  "likert_5",
  "likert_7",
  "matrix",
  "numeric",
  "short_text",
  "long_text",
] as const;
/** Types a builder user can add as a custom question. Matrix needs a rows/columns editor first. */
export const CUSTOM_QUESTION_TYPES = ["single_choice", "multi_select", "likert_5", "likert_7", "numeric", "short_text", "long_text"] as const satisfies readonly QuestionType[];
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const SECTION_CATEGORIES = [
  "core_context",
  "ai_adoption",
  "validated_measures",
  "ngg_measures",
  "outcomes",
  "qualitative",
  "custom",
] as const;
export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

export const VERSION_STATUSES = ["draft", "approved", "published", "closed"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];

export const WAVE_TYPES = ["baseline", "follow_up"] as const;
export type WaveType = (typeof WAVE_TYPES)[number];

export const WAVE_STATUSES = ["draft", "scheduled", "open", "closed"] as const;
export type WaveStatus = (typeof WAVE_STATUSES)[number];

export const DISTRIBUTION_MODES = ["public_link", "unique_tokens"] as const;
export type DistributionMode = (typeof DISTRIBUTION_MODES)[number];

export const PRIVACY_MODES = ["anonymous", "pseudonymous"] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];

export const AUDIENCE_SCOPES = ["all_organization", "selected_units", "managers_only", "employee_sample"] as const;
export type AudienceScope = (typeof AUDIENCE_SCOPES)[number];

export const RESPONDENT_STATUSES = ["invited", "started", "completed"] as const;
export type RespondentStatus = (typeof RESPONDENT_STATUSES)[number];

export const INSIGHT_TYPES = ["executive_summary", "explain_change", "goal_suggestions", "open_text_themes"] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export const INSIGHT_STATUSES = ["draft", "reviewed", "published", "rejected"] as const;
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

export const GOAL_STATUSES = ["draft", "active", "in_progress", "review", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_SOURCES = ["ai", "human"] as const;
export type GoalSource = (typeof GOAL_SOURCES)[number];

export const APPROVAL_STATES = ["pending", "approved", "rejected"] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const TARGET_DIRECTIONS = ["increase", "decrease", "maintain"] as const;
export type TargetDirection = (typeof TARGET_DIRECTIONS)[number];

export const GOAL_SCOPES = ["organization", "unit", "management", "team"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

/** Segment attributes a respondent may carry (spec §28). */
export const SEGMENT_KEYS = ["department", "role_family", "is_manager", "seniority", "location"] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export const DEFAULT_PRIVACY_THRESHOLD = 7;
export const MIN_PRIVACY_THRESHOLD = 5;
