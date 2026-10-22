# Production-readiness audit — GadgetWise React

## Confirmed from the existing default branch

- `src/data.js` describes its dataset as fictional/demo records.
- `src/lib/supabase.js` initializes Supabase only when frontend variables exist.
- `src/lib/auth.js` falls back to a localStorage identity when Supabase is not configured; its comments explicitly describe demo mode.
- The login/register pages disclose demo-mode behavior when no backend is configured.
- `src/pages/Admin.jsx` contains an admin sign-in flow that accepts any credentials and writes `gw-admin` to sessionStorage; catalog/review edits are held in component state.
- The admin product API control fills sample data and displays a mock API response.
- `src/pages/GadgetDetail.jsx` describes review submission as simulated.
- `src/components/ui.jsx` seeds the wishlist in localStorage.
- `src/pages/ComparisonHistory.jsx` seeds demo comparison sessions into localStorage.
- `src/pages/ReviewHistory.jsx` contains seeded demo reviews.
- `check.js` verifies a subset of deterministic scoring logic, not deployed authentication or backend authorization.
- A Supabase dependency/client is present, but this does not prove a database has been configured or deployed.

## Priority blockers

1. Replace the admin demo sign-in with role checks enforced by the backend and database policies.
2. Apply and verify a schema/RLS migration against an isolated Supabase project.
3. Add a trustworthy catalog import and provenance workflow; do not silently publish fictional seed data.
4. Convert catalog, user profile, wishlist, comparison history, and review CRUD to persistent data services.
5. Add the deployed AI function, secure provider configuration, and catalog-grounded response validation.
6. Add automated integration/E2E tests and direct RLS tests with at least two separate users.
7. Verify production redirect URLs, CORS, function secrets, and the selected deployment runtime.

## Work introduced on branch `feat/full-stack-readiness`

- Database schema and RLS policy foundation.
- Server-side catalog-grounded AI Edge Function.
- AI assistant UI page.
- Environment and architecture/deployment documentation.

## Not yet verified

The migration has not been applied to a live database. The Edge Function has not been deployed or run against the working provider key. The app's existing data pages have not yet all been migrated off mock data/localStorage. Automated live auth, RLS, browser, and AI provider tests have not been run. Do not represent this branch as production-ready.
