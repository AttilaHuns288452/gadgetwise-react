# GadgetWise (React + Tailwind)

Transparent, student-focused gadget recommendations ranked by what gadgets
actually **cost to own**. React 19 + Tailwind CSS v4 SPA with a real Supabase
backend (auth + Postgres + Row Level Security) and live Lazada product search.

**Live:** https://gadgetwise-react.vercel.app/
(GitHub Pages build: https://attilahuns288452.github.io/gadgetwise-react/)

## Pages

| Route | What it is |
|---|---|
| `#/` | Home — hero, categories, cheapest-to-own, best-value Pareto scatter (hover + click) |
| `#/gadgets` | Catalog — search, category filters, sorting, live Lazada results |
| `#/g/:id` | Detail — Overview / Value & Ownership / Reviews / Issues tabs |
| `#/compare` | Side-by-side compare (up to 4 gadgets) |
| `#/recommend` | 5-step recommendation wizard with full score breakdown |
| `#/wishlist`, `#/profile`, `#/compare-history`, `#/review-history` | Account |
| `#/admin` | Staff console (prototype gate — no real auth; see Security) |

## Method (unchanged from the prototype)

- **Performance to Cost index:** battery 25 + student rating 25 + value 30
  (price vs category median monthly cost) + warranty 20.
- **Cost per month:** price ÷ 36 (fixed window).
- **Recommendation score (100 pts):** Budget Fit 20 · Academic Suitability 25 ·
  Your Priorities 50 · Community Rating 5. Every point is shown to the user.
- Pareto best-value frontier: no other gadget is both cheaper and better indexed.

## Data provenance (honesty)

Three distinct sources, never mixed:

1. **Curated catalog** (`src/data.js`) — illustrative student-project data. The
   admin console labels all derived metrics as sample data, not live retailer
   figures.
2. **Live Lazada listings** (`src/lib/marketplace.js`) — real-time search via the
   serverless proxy. Marketplace items carry a "Live marketplace listing" badge
   and neutral (not fabricated) scoring where the source has no curated value.
3. **User data** — real Supabase records, RLS-isolated per account.

## Architecture

- **Frontend:** React + Vite + Tailwind, React Router (HashRouter).
- **Auth:** Supabase Auth (`src/lib/auth.js`). Falls back to localStorage demo
  mode when `VITE_SUPABASE_URL` is not configured, so the app stays browsable.
- **Database:** Supabase Postgres (`src/lib/store.js` is the single data seam).
  Migrations in `supabase/migrations/`.
- **Product search:** Vercel serverless (`api/lazada/`) proxies the RapidAPI
  Lazada API. **The API key is server-side only** — never in the browser bundle.

### Security model (verified against the live DB)

Row Level Security is enabled on every user-owned table (14 policies):

- Guests: `401` on all private tables.
- Users: read/write **only their own** rows (`auth.uid() = user_id`).
- Cross-user read = 0 rows; cross-user update/delete = no-op (rows survive).
- Spoofing `user_id` on insert = `403` (with-check rejects).
- `user_id` defaults to `auth.uid()` (migration 0002).
- The service-role key is server-side only; it is not in the client bundle.

> **Admin console caveat:** the `/admin` gate is a labeled prototype door with **no
> security** — it is not real staff authentication. Real admin authorization
> requires a role check that is not wired up in this build.

## Setup

```bash
npm install
npm run dev        # local dev
npm test           # 31 unit tests (node --test)
node check.js      # runnable check of the scoring logic
npm run build      # docs/ (GitHub Pages) or dist/ (Vercel, via VERCEL=1)
```

## Environment variables

See `.env.example`. In Vercel (Settings → Environment Variables):

| Key | Type | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | Config | browser |
| `VITE_SUPABASE_ANON_KEY` | Config | browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | serverless only |
| `LAZADA_API_KEY` | Secret | serverless only |
| `LAZADA_API_BASE` | Config | `https://lazada-api.p.rapidapi.com/lazada` |

Without the `VITE_*` vars the app runs in demo mode (localStorage); real auth
and persistence activate automatically once they are set.

## Migrations

`supabase/migrations/` — apply in order via the Supabase SQL editor or the
Management API. `0001_init.sql` creates profiles/wishlist/comparison_history/
reviews with RLS + a signup trigger; `0002_user_id_default.sql` sets
`user_id` defaults to `auth.uid()`.

## Deploy

Two targets share one `vite.config.js`:
- **Vercel** (production, serverless API): push to `master`.
- **GitHub Pages** (static, `/docs`): push to `master`.

## Known limitations

- **Lazada search** returns `429 monthly quota exceeded` on the RapidAPI BASIC
  plan. Upgrade the plan or wait for the monthly reset. The integration itself is
  tested and correct; the quota is an external billing limit.
- Admin authorization is a prototype gate, not DB-enforced roles.
