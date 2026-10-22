import { useEffect, useState } from "react";
import { money } from "../lib.js";
import { Stars } from "./ui.jsx";
import { registerListings } from "../lib/marketplace.js";

/**
 * Live Lazada marketplace results. Separate from the curated catalog on
 * purpose: scraper data is real but unvetted, so it never mixes into the
 * recommendation/compare catalog. Links go straight to the Lazada listing.
 */
/**
 * Merge staggered search responses: dedupe by productId and surface whether
 * the upstream rate-limited us (so we can say "busy" instead of "no results").
 */
function merge(results) {
  const seen = new Set();
  const items = [];
  let rateLimited = false;
  let error = null;
  for (const d of results) {
    if (d?.error?.code === "rate_limited") rateLimited = true;
    else if (d?.error && !error) error = d.error.message || null;
    for (const p of d.products || []) {
      if (p.productId && !seen.has(p.productId)) {
        seen.add(p.productId);
        items.push(p);
      }
    }
  }
  return { items, rateLimited, error };
}

export default function LiveSearch({ query }) {
  const [state, setState] = useState({ status: "idle", items: [], error: null });

  useEffect(() => {
    const q = (query || "").trim();
    if (q.length < 2) {
      setState({ status: "idle", items: [], error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));

    // Walk real pages with the cursor. The upstream has thousands of results per
    // query (count: 3247 for "laptop"); `page` + `start_key` together advance it.
    // ponytail: paced (not parallel) to stay under the upstream rate limit, and
    // capped at 6 pages so one search can't exhaust the monthly quota.
    const MAX_PAGES = 6;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      const results = [];
      let cursor = "";
      for (let page = 1; page <= MAX_PAGES; page++) {
        if (cancelled) return;
        if (page > 1) {
          if (!cursor) break; // no more pages
          await sleep(500); // gentle pacing: avoid burst 429s
        }
        const qs = new URLSearchParams({ q, marketplace: "ph", page: String(page) });
        if (cursor) qs.set("start_key", cursor);
        try {
          const r = await fetch(`/api/lazada/search?${qs}`);
          const d = await r.json();
          results.push(r.ok ? d : { error: d?.error, products: [] });
          cursor = r.ok ? (d.next || "") : "";
        } catch {
          results.push({ products: [] });
          cursor = "";
        }
        // Show results as they arrive instead of waiting for every page.
        const merged = merge(results);
        if (!cancelled) {
          if (merged.items.length) {
            registerListings(merged.items);
            setState({ status: "ready", items: merged.items, error: null });
          } else {
            const e = merged.rateLimited
              ? "Marketplace is busy right now (rate limit). Please try again in a minute."
              : merged.error || "No live listings found.";
            setState({ status: "error", items: [], error: e });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const q = (query || "").trim();
  if (q.length < 2) return null;

  return (
    <section className="mt-8" aria-label="Live marketplace results">
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl">Live marketplace results</h2>
        <span className="text-sm text-ink3">real-time from Lazada · opens GadgetWise detail</span>
      </div>

      {state.status === "loading" && (
        <div className="mt-3 text-sm text-ink2">Searching Lazada for “{q}”…</div>
      )}

      {state.status === "error" && (
        <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm text-ink2">
          {state.error}
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="mt-3 text-sm text-ink2">No live listings found for “{q}”.</div>
      )}

      {state.items.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {state.items.map((p) => (
            <a
              key={p.productId || p.productUrl}
              href={`#/g/lazada-${p.productId}`}
              className="flex flex-col overflow-hidden rounded-xl border border-line-strong bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#F9FAFB]">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.title || "Lazada listing"}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink3">No image</div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-2.5">
                <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink3">
                  {p.brandName || p.sellerName || "Lazada"}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-ink">{p.title}</div>
                <div className="mt-1">
                  {typeof p.rating === "number" && p.rating > 0 ? (
                    <Stars rating={p.rating} count={p.reviewCount ?? 0} />
                  ) : (
                    <span className="text-[0.65rem] text-ink3">No ratings yet</span>
                  )}
                </div>
                <div className="mt-auto pt-1.5">
                  <div className="mono text-base font-bold text-ink">
                    {p.price != null ? money(p.price) : "Price unavailable"}
                  </div>
                  {p.originalPrice != null && p.originalPrice > (p.price || 0) && (
                    <div className="text-[0.65rem] text-ink3 line-through">{money(p.originalPrice)}</div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
