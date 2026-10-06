CREATE TABLE "distribution_results" (
	"id" text PRIMARY KEY NOT NULL,
	"wave_id" text NOT NULL,
	"item_canonical_id" text NOT NULL,
	"segment_key" text DEFAULT 'all' NOT NULL,
	"segment_value" text DEFAULT 'all' NOT NULL,
	"buckets" jsonb NOT NULL,
	"n" integer NOT NULL,
	"suppressed" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "distribution_results" ADD CONSTRAINT "distribution_results_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_results_unique_idx" ON "distribution_results" USING btree ("wave_id","item_canonical_id","segment_key","segment_value");