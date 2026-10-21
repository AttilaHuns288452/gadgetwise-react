import { useEffect, useState } from "react";
import { money } from "../lib.js";
import { Stars } from "./ui.jsx";
import { registerListings } from "../lib/marketplace.js";

/**
 * Live Lazada marketplace results. Separate from the curated catalog on
 * purpose: scraper data is real but unvetted, so it never mixes into the
 * recommendation/compare catalog. Links go straight to the Lazada listing.
 */
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

    const url = `/api/lazada/search?q=${encodeURIComponent(q)}&marketplace=ph`;
    fetch(url)
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setState({ status: "error", items: [], error: data?.error?.message || "Search is unavailable right now." });
          return;
        }
        const items = data.products || [];
        registerListings(items); // map + register so /#/g/:id resolves on our detail page
        setState({ status: "ready", items, error: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", items: [], error: "Could not reach the marketplace." });
      });

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
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {state.items.map((p) => (
            <a
              key={p.productId || p.productUrl}
              href={`#/g/lazada-${p.productId}`}
              className="flex flex-col overflow-hidden rounded-xl border border-line-strong bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F9FAFB]">
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
              <div className="flex flex-1 flex-col p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink3">
                  {p.brandName || p.sellerName || "Lazada"}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink">{p.title}</div>
                <div className="mt-2">
                  {typeof p.rating === "number" && p.rating > 0 ? (
                    <Stars rating={p.rating} count={p.reviewCount ?? 0} />
                  ) : (
                    <span className="text-xs text-ink3">No ratings yet</span>
                  )}
                </div>
                <div className="mt-auto pt-2">
                  <div className="mono text-lg font-bold text-ink">
                    {p.price != null ? money(p.price) : "Price unavailable"}
                  </div>
                  {p.originalPrice != null && p.originalPrice > (p.price || 0) && (
                    <div className="text-xs text-ink3 line-through">{money(p.originalPrice)}</div>
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
