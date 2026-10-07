CREATE TABLE "aggregate_results" (
	"id" text PRIMARY KEY NOT NULL,
	"wave_id" text NOT NULL,
	"kind" text NOT NULL,
	"metric_id" text NOT NULL,
	"segment_key" text DEFAULT 'all' NOT NULL,
	"segment_value" text DEFAULT 'all' NOT NULL,
	"payload" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "aggregate_results" ADD CONSTRAINT "aggregate_results_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aggregate_results_unique_idx" ON "aggregate_results" USING btree ("wave_id","kind","metric_id","segment_key","segment_value");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
-- Keep the new tables closed to the Supabase Data API, consistent with 0002_lock_down_public_api.sql.
ALTER TABLE public.aggregate_results ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aggregate_results', 'password_reset_tokens', 'rate_limits'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
