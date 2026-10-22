# GadgetWise

GadgetWise is a React app for Filipino students to compare gadgets using explicit costs, specifications, and transparent recommendation scores. This branch adds a Supabase backend foundation and a server-side AI assistant while preserving the existing React/Tailwind interface.

**Important status:** the backend schema and AI function are implemented in source, but the Supabase migrations and Edge Function are not deployed automatically by GitHub. The catalog also needs verified records imported before it can be treated as a live product-data service. See [the setup guide](docs/setup-and-deployment.md) and [the current readiness audit](docs/production-readiness-audit.md).

**Current public demo:** https://attilahuns288452.github.io/gadgetwise-react/

## Routes

| Route | Purpose |
| --- | --- |
| \`#/\` | Home — categories, ownership cost, and value summaries |
| \`#/gadgets\` | Catalog — search, category filters, sorting |
| \`#/g/:id\` | Product details, ownership cost, reviews, and issues |
| \`#/compare\` | Compare up to four gadgets |
| \`#/compare-history\` | Recent comparison history |
| \`#/recommend\` | Five-step transparent recommendation wizard |
| \`#/assistant\` | Catalog-grounded AI assistant (requires configured Supabase backend and AI provider) |
| \`#/wishlist\` | Saved gadgets |
| \`#/profile\` | Account and personal activity |
| \`#/review-history\` | Reviews submitted from the signed-in account |
| \`#/login\`, \`#/register\` | Supabase Auth |
| \`#/admin\` | Database-backed administrator console; requires an explicitly assigned admin role |

## Recommendation method

- **Performance to Cost index:** battery 25 + student rating 25 + value 30 (price versus category median monthly cost) + warranty 20.
- **Cost per month:** price ÷ 36 using a fixed comparison window.
- **Recommendation score:** Budget Fit 20 · Academic Suitability 25 · Your Priorities 50 · Community Rating 5. Score factors are displayed to the user.
- **Pareto frontier:** no other gadget is both cheaper and higher-indexed.

The AI assistant does not replace the deterministic score. It explains trade-offs using catalog records that the current user is allowed to read.

## Local development

\`\`\`bash
npm ci
npm run dev
npm test
node check.js
npm run build
\`\`\`

Copy \`.env.example\` to your local environment file and configure \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` to use the backend. Optional demo authentication can only be enabled in local Vite development by setting \`VITE_ENABLE_DEMO_AUTH=true\`; it does not create real accounts and must not be used as production authentication.

Do not put AI-provider keys, service-role keys, or other privileged secrets in \`VITE_*\` variables. Configure those secrets only in the server-side Supabase Edge Function environment.

## Backend setup

1. Review and apply the migrations under \`supabase/migrations/\` to the intended Supabase project after checking its current schema.
2. Configure Supabase Auth redirect URLs for the real frontend origin.
3. Assign the first administrator through a trusted private operator/database workflow. Never allow public self-assignment of roles.
4. Import catalog records only with a traceable source and verified fields. New records are unpublished by default.
5. Configure the Edge Function secrets and deploy \`gadget-assistant\` as documented in [the deployment guide](docs/setup-and-deployment.md).
6. Test auth, RLS with multiple accounts, product publishing, reviews/moderation, AI failure handling, and the deployed frontend origin before claiming production readiness.

The migrations do not insert fictional product entries. Once Supabase is configured in the frontend, the app deliberately does not silently fall back to demo products if live catalog requests fail.

## Deployment

The app uses HashRouter so the same frontend can be hosted as a GitHub Pages project site or a Vercel root deployment. \`vite.config.js\` writes GitHub Pages output to \`docs/\` and Vercel output to \`dist/\`.

The GitHub Actions workflow runs unit tests, the existing scoring check, and a production build. Passing that workflow proves only the checks it runs; it does not prove that a live Supabase project or AI provider is configured correctly.

## Data accuracy

The repository's original dataset contains illustrative demo prices, scores, and reviews for real product names. Wikimedia product images do not verify prices or specifications. Do not treat that sample dataset as current retailer data. Real catalog records should carry a source URL and be verified before publication.
