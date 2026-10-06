# Working in this repository

- Product source of truth: `docs/NGG_AI_Assessment_Interface_Spec.md`. Architecture: `docs/ARCHITECTURE.md`.
  Open decisions: `docs/DECISIONS.md`. Visual reference: `design/` (mockups, not production code).
- Stack: Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 (tokens in `src/app/globals.css`),
  Drizzle ORM on PostgreSQL (PGlite locally), Zod, Vitest.
- Layering: `src/domain` is pure (no I/O). `src/server` does I/O and enforces authorization inside
  services. `src/app` is thin. UI never imports `src/server` except through server components/actions.
- Hebrew RTL first: use logical Tailwind utilities (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`,
  `text-start`). Never `pl-`/`pr-`/`left-`/`right-`.
- Database exposure: every table in `public` must have row-level security enabled and no grants to
  `anon`/`authenticated` (Supabase Data API). Any migration that adds a table must end with
  `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;` — see `drizzle/0002_lock_down_public_api.sql`.
- Privacy: client-facing code never reads `responses`. Segments under the client threshold are rendered
  with `<PrivacyProtected />`, never omitted silently.
- AI: all calls go through `src/server/ai`. Outputs are Zod-validated and start as drafts.
- Commands: `npm run dev`, `npm run db:migrate`, `npm run db:seed`, `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run build`.
