# GadgetWise (React + Tailwind)

Static demo site: transparent, student-focused gadget recommendations ranked by
what gadgets actually **cost to own**. Rebuilt from the HTML prototype
(`gadgetwise-prototype`) as a React 19 + Tailwind CSS v4 single-page app with
fake data — no backend.

**Live:** https://attilahuns288452.github.io/gadgetwise-react/

## Pages

| Route | What it is |
|---|---|
| `#/` | Home — hero, categories, cheapest-to-own, best-value scatter |
| `#/gadgets` | Catalog — search, category filters, sorting |
| `#/g/:id` | Detail — Overview / Value & Ownership / Reviews / Issues tabs |
| `#/compare` | Side-by-side compare (up to 4 gadgets) |
| `#/recommend` | 5-step recommendation wizard with full score breakdown |

## Method (unchanged from the prototype)

- **Performance to Cost index:** battery 25 + student rating 25 + value 30
  (price vs category median monthly cost) + warranty 20.
- **Cost per month:** price ÷ 36 (fixed window, all gadgets).
- **Recommendation score (100 pts):** Budget Fit 20 · Academic Suitability 25 ·
  Your Priorities 50 · Community Rating 5. Every point is shown to the user.
- Pareto best-value frontier: no other gadget is both cheaper and better indexed.

## Develop

```bash
npm install
npm run dev       # local dev server
npm run build     # builds into docs/ (GitHub Pages serves this folder)
node check.js     # one runnable check of the ported scoring logic
```

Deployment is GitHub Pages **"Deploy from a branch"** — `main` / `/docs`.
`vite.config.js` sets `base: "/gadgetwise-react/"` to match the project-site URL.

## Data

`src/data.js` is a straight ES-module conversion of the prototype's mock
dataset (21 gadgets, reviews, use cases, budget bands). Product photos are
Wikimedia Commons assets; specs, prices, scores and reviews are illustrative
demo data.
