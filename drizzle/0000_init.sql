CREATE TYPE "public"."approval_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."audience" AS ENUM('all', 'managers', 'employees');--> statement-breakpoint
CREATE TYPE "public"."audience_scope" AS ENUM('all_organization', 'selected_units', 'managers_only', 'employee_sample');--> statement-breakpoint
CREATE TYPE "public"."client_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."distribution_mode" AS ENUM('public_link', 'unique_tokens');--> statement-breakpoint
CREATE TYPE "public"."goal_scope" AS ENUM('organization', 'unit', 'management', 'team');--> statement-breakpoint
CREATE TYPE "public"."goal_source" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('draft', 'active', 'in_progress', 'review', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."insight_status" AS ENUM('draft', 'reviewed', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."insight_type" AS ENUM('executive_summary', 'explain_change', 'goal_suggestions', 'open_text_themes');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('he', 'en');--> statement-breakpoint
CREATE TYPE "public"."ngg_role" AS ENUM('super_admin', 'project_manager', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."privacy_mode" AS ENUM('anonymous', 'pseudonymous');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('setup', 'collecting', 'analysis', 'follow_up', 'closed');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multi_select', 'likert_5', 'likert_7', 'matrix', 'numeric', 'short_text', 'long_text');--> statement-breakpoint
CREATE TYPE "public"."research_mode" AS ENUM('research_safe', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."research_status" AS ENUM('validated', 'ngg_measure', 'experimental', 'custom');--> statement-breakpoint
CREATE TYPE "public"."respondent_status" AS ENUM('invited', 'started', 'completed');--> statement-breakpoint
CREATE TYPE "public"."section_category" AS ENUM('core_context', 'ai_adoption', 'validated_measures', 'ngg_measures', 'outcomes', 'qualitative', 'custom');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('validated', 'ngg_measure', 'client_custom');--> statement-breakpoint
CREATE TYPE "public"."target_direction" AS ENUM('increase', 'decrease', 'maintain');--> statement-breakpoint
CREATE TYPE "public"."user_kind" AS ENUM('ngg', 'client');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('draft', 'approved', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."wave_status" AS ENUM('draft', 'scheduled', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."wave_type" AS ENUM('baseline', 'follow_up');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"client_id" text,
	"project_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_user_project_access" (
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_user_project_access_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"organization_size" integer,
	"locale" "locale" DEFAULT 'he' NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"segment_taxonomy" jsonb DEFAULT '{"departments":[],"roleFamilies":[],"seniorityGroups":[],"locations":[]}'::jsonb NOT NULL,
	"privacy_threshold" integer DEFAULT 7 NOT NULL,
	"allow_client_invites" boolean DEFAULT false NOT NULL,
	"retention_days" integer DEFAULT 730 NOT NULL,
	"survey_contact" text,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"owner_name" text,
	"owner_user_id" text,
	"scope" "goal_scope" DEFAULT 'organization' NOT NULL,
	"related_metric_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"baseline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_direction" "target_direction" DEFAULT 'increase' NOT NULL,
	"target_value" real,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_date" timestamp with time zone,
	"status" "goal_status" DEFAULT 'draft' NOT NULL,
	"source" "goal_source" DEFAULT 'human' NOT NULL,
	"approval_state" "approval_state" DEFAULT 'pending' NOT NULL,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"source_insight_id" text,
	"published_to_client" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_map" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"email_hash" text NOT NULL,
	"respondent_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"wave_id" text,
	"comparison_wave_id" text,
	"type" "insight_type" NOT NULL,
	"status" "insight_status" DEFAULT 'draft' NOT NULL,
	"payload" jsonb NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"validation_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"prompt_template" text,
	"created_by_user_id" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"client_role" "client_role" NOT NULL,
	"project_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_results" (
	"id" text PRIMARY KEY NOT NULL,
	"wave_id" text NOT NULL,
	"metric_id" text NOT NULL,
	"segment_key" text DEFAULT 'all' NOT NULL,
	"segment_value" text DEFAULT 'all' NOT NULL,
	"score" real,
	"n" integer NOT NULL,
	"item_count" integer NOT NULL,
	"suppressed" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_assignments_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'setup' NOT NULL,
	"manager_user_id" text,
	"research_mode" "research_mode" DEFAULT 'research_safe' NOT NULL,
	"next_follow_up_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"canonical_id" text NOT NULL,
	"section_key" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"type" "question_type" NOT NULL,
	"source_type" "source_type" NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"content" jsonb NOT NULL,
	"metric_id" text,
	"reverse_coded" boolean DEFAULT false NOT NULL,
	"audience" "audience",
	"required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_templates_canonical_id_unique" UNIQUE("canonical_id")
);
--> statement-breakpoint
CREATE TABLE "questionnaire_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"questionnaire_id" text NOT NULL,
	"version_label" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" "version_status" DEFAULT 'draft' NOT NULL,
	"definition" jsonb NOT NULL,
	"based_on_version_id" text,
	"created_by_user_id" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "respondents" (
	"id" text PRIMARY KEY NOT NULL,
	"wave_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"pseudo_identifier" text,
	"segment_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "respondent_status" DEFAULT 'invited' NOT NULL,
	"current_section_index" integer DEFAULT 0 NOT NULL,
	"locale" "locale" DEFAULT 'he' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" text PRIMARY KEY NOT NULL,
	"respondent_id" text NOT NULL,
	"wave_id" text NOT NULL,
	"question_canonical_id" text NOT NULL,
	"question_version" text NOT NULL,
	"value" jsonb,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"category" "section_category" NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"source_type" "source_type" NOT NULL,
	"research_status" "research_status" NOT NULL,
	"audience" "audience" DEFAULT 'all' NOT NULL,
	"recommended_core" boolean DEFAULT false NOT NULL,
	"longitudinal_core" boolean DEFAULT false NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	"source_reference" text,
	"display_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"kind" "user_kind" NOT NULL,
	"ngg_role" "ngg_role",
	"client_role" "client_role",
	"client_id" text,
	"locale" "locale" DEFAULT 'he' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waves" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "wave_type" NOT NULL,
	"status" "wave_status" DEFAULT 'draft' NOT NULL,
	"questionnaire_version_id" text,
	"baseline_wave_id" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"audience" jsonb DEFAULT '{"scope":"all_organization"}'::jsonb NOT NULL,
	"distribution_mode" "distribution_mode" DEFAULT 'public_link' NOT NULL,
	"privacy_mode" "privacy_mode" DEFAULT 'anonymous' NOT NULL,
	"public_token" text,
	"invited_count" integer DEFAULT 0 NOT NULL,
	"locale" "locale" DEFAULT 'he' NOT NULL,
	"published_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_user_project_access" ADD CONSTRAINT "client_user_project_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_user_project_access" ADD CONSTRAINT "client_user_project_access_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_map" ADD CONSTRAINT "identity_map_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_results" ADD CONSTRAINT "metric_results_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_templates" ADD CONSTRAINT "question_templates_section_key_section_templates_key_fk" FOREIGN KEY ("section_key") REFERENCES "public"."section_templates"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respondents" ADD CONSTRAINT "respondents_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_respondent_id_respondents_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."respondents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waves" ADD CONSTRAINT "waves_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waves" ADD CONSTRAINT "waves_questionnaire_version_id_questionnaire_versions_id_fk" FOREIGN KEY ("questionnaire_version_id") REFERENCES "public"."questionnaire_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_client_idx" ON "audit_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_slug_idx" ON "clients" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "goals_project_idx" ON "goals" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_map_project_email_idx" ON "identity_map" USING btree ("project_id","email_hash");--> statement-breakpoint
CREATE INDEX "insights_project_idx" ON "insights" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "insights_status_idx" ON "insights" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_idx" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_client_idx" ON "invitations" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "metric_results_unique_idx" ON "metric_results" USING btree ("wave_id","metric_id","segment_key","segment_value");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "question_templates_section_idx" ON "question_templates" USING btree ("section_key");--> statement-breakpoint
CREATE UNIQUE INDEX "qv_number_idx" ON "questionnaire_versions" USING btree ("questionnaire_id","version_number");--> statement-breakpoint
CREATE INDEX "questionnaires_project_idx" ON "questionnaires" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "respondents_token_idx" ON "respondents" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "respondents_wave_idx" ON "respondents" USING btree ("wave_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_respondent_question_idx" ON "responses" USING btree ("respondent_id","question_canonical_id");--> statement-breakpoint
CREATE INDEX "responses_wave_idx" ON "responses" USING btree ("wave_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_client_idx" ON "users" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "waves_project_idx" ON "waves" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waves_code_idx" ON "waves" USING btree ("project_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "waves_public_token_idx" ON "waves" USING btree ("public_token");