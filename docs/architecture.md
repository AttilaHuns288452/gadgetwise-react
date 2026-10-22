# GadgetWise architecture (implementation branch)

## Current direction

- **Frontend:** React 19 + Vite + Tailwind; current hash-based routing is retained for GitHub Pages compatibility.
- **Authentication:** Supabase Auth via `src/lib/auth.js`.
- **Database:** Supabase PostgreSQL; schema foundation is in `supabase/migrations/202610220001_core_schema.sql`.
- **Authorization:** PostgreSQL Row Level Security policies scope personal records to the current authenticated user. Catalog writes and review moderation require an administrator role stored separately from editable profile metadata.
- **AI:** `supabase/functions/gadget-assistant/index.ts` is an OpenAI-compatible server-side provider adapter. AI credentials are read from Edge Function secrets; the browser never receives the provider key.
- **Recommendation scoring:** Existing deterministic scoring in `src/lib.js` remains the source of the recommendation ranking. AI responses should explain product trade-offs, not replace the score.

## Database notes

The migration defines profiles, separate user roles, categories, gadgets, reviews, wishlist items, comparison history, recommendation history, and daily AI usage quotas. New catalog records are unpublished by default and product source/provenance fields are explicit.

This is a schema foundation, not proof that the migration has been applied to a Supabase project. Review the current remote database before applying it. Existing mock catalog objects still require an explicit mapping/import process; they must not be presented as verified product data.

## Required follow-through

The remaining application must migrate each catalog and account page from demo arrays/localStorage to the database services and add a proper administrator setup procedure. The AI assistant page needs a deployed Supabase function and matching secrets before live requests can succeed. Live RLS behavior must be tested against an isolated Supabase project.
