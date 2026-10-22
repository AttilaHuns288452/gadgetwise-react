# GadgetWise setup and deployment

## Frontend

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to the appropriate local environment file and fill in your Supabase project URL and publishable/anon key.
3. Run `npm run dev`.
4. Run `npm test` and `npm run build`.

Never put the AI provider key or Supabase service-role key in any `VITE_*` variable.

## Supabase schema

Review `supabase/migrations/202610220001_core_schema.sql` against the target project's current schema, then apply with the Supabase CLI from a linked, backed-up project. Do not run unreviewed destructive migrations against production.

Example flow:
```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push
```

The schema does not seed fictional product records as verified/published products. Import only records whose provenance and accuracy have been reviewed. Create the first administrator through a trusted, private operator workflow after a real user has registered; never expose a default admin password or public role-assignment function.

## AI Edge Function

Configure secrets in the Supabase project's Edge Function environment:
```sh
supabase secrets set AI_API_KEY=YOUR_PROVIDER_KEY AI_MODEL=YOUR_MODEL_ID
supabase secrets set AI_BASE_URL=https://api.openai.com/v1
supabase secrets set ALLOWED_ORIGINS=https://YOUR_PRODUCTION_ORIGIN
supabase functions deploy gadget-assistant
```

Use the API base URL required by your actual OpenAI-compatible provider. If the working AI key is for a provider with a different request protocol, implement a provider adapter rather than guessing its endpoint.

The function currently requires an authenticated user and limits each account to 20 attempted requests per UTC day. It reads only published catalog records available to the caller under RLS. The Supabase migration must be applied first for the quota RPC to work.

## Important verification boundary

Creating files in the repository does not apply a migration or deploy an Edge Function. Before announcing the feature is live, test sign-in, the deployed function, provider quota/error handling, RLS with multiple test accounts, and the production frontend origin. Verify no provider secrets appear in built assets.

## Lazada live product search

The repository includes a server-side Vercel route at `/api/lazada/search`, with normalization and a short in-memory cache. Configure `LAZADA_API_KEY` (preferred) or the backwards-compatible `OMKAR_LAZADA_API_KEY` in Vercel project environment variables for the appropriate deployment environments. Never use a `VITE_*` name for this credential. The endpoint queries a Lazada/TMAPI-compatible provider through the existing `lib/lazada.js` adapter. Check the provider plan, rate limits, and response contract for the key you use.

The endpoint is a Vercel serverless route and will not execute on GitHub Pages hosting by itself. On GitHub Pages, live search requires a separately deployed server-side API origin and an explicit frontend configuration/proxy; otherwise the UI must report the endpoint as unavailable. The Admin product lookup uses the same-origin route and only copies the selected listing into an unpublished/editable form. It does not write search results automatically into the curated catalog. Verify brand/model, source URL, category, price and specifications, and complete all recommendation scores before publication.
