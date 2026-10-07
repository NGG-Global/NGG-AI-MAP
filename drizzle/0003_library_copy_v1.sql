CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "section_templates" ADD COLUMN "intro" jsonb;--> statement-breakpoint
ALTER TABLE "section_templates" ADD COLUMN "fallback_intro" jsonb;--> statement-breakpoint
ALTER TABLE "section_templates" ADD COLUMN "required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Keep the new table closed to the Supabase Data API, consistent with 0002_lock_down_public_api.sql.
ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.app_meta FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.app_meta FROM authenticated';
  END IF;
END $$;
