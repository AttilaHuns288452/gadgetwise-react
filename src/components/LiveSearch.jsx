import { useEffect, useRef, useState } from "react";
import { money } from "../lib.js";
import { Stars } from "./ui.jsx";
import { registerListings, searchMarketplacePage } from "../lib/marketplace.js";

/**
 * Live Lazada marketplace results. Separate from the curated catalog on
 * purpose: scraper data is real but unvetted, so it never mixes into the
 * recommendation/compare catalog. Links go straight to the Lazada listing.
 *
 * GW-11: a keystroke no longer starts a 6-page fetch loop. The query is
 * debounced, the request is abortable, and extra pages load only when the
 * user asks for them.
 * GW-13: a failed fetch is an ERROR, never an empty result list.
 */
const DEBOUNCE_MS = 350;

const IDLE = { status: "idle", items: [], error: null, errorCode: null, next: "", page: 0, loadedQuery: "" };

export default function LiveSearch({ query }) {
  const [state, setState] = useState(IDLE);
  const [loadingMore, setLoadingMore] = useState(false);
  // the query the user last asked for; the debounce timer reads it
  const wantRef = useRef("");
  const abortRef = useRef(null);
  // mirror of the rendered items so a "load more" can append without reading
  // a stale state snapshot
  const itemsRef = useRef([]);

  const run = async (q, { page = 1, cursor = "" } = {}) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const append = page > 1;
    // GW-13: a new query clears the previous query's results instead of
    // showing them under the new search term.
    if (!append) itemsRef.current = [];
    setState((s) => ({
      ...s,
      status: append ? s.status : "loading",
      items: append ? s.items : [],
      error: null,
      errorCode: null,
    }));
    const res = await searchMarketplacePage({
      q,
      page,
      startKey: cursor,
      signal: ctrl.signal,
    });
    // re-check cancellation after every await: a stale response must never
    // overwrite the results of a newer query
    if (ctrl.signal.aborted || res.aborted) return;
    if (!res.ok) {
      setState((s) => ({
        ...s,
        status: "error",
        items: append ? s.items : [],
        error: res.error?.message || "Product search is temporarily unavailable. Please try again.",
        errorCode: res.error?.code || "search_failed",
      }));
      return;
    }
    const items = append ? mergeItems(itemsRef.current, res.products) : res.products;
    if (items.length) registerListings(items);
    itemsRef.current = items;
    setState({ status: "ready", items, error: null, errorCode: null, next: res.next || "", page, loadedQuery: q });
  };

  useEffect(() => {
    const q = (query || "").trim();
    wantRef.current = q;
    if (q.length < 2) {
      abortRef.current?.abort();
      itemsRef.current = [];
      setState(IDLE);
      return;
    }
    // GW-11: debounce so one query does not start a fetch loop per keystroke.
    const t = setTimeout(() => {
      if (wantRef.current !== q) return; // a newer query won the race
      run(q);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort(); // cancel the in-flight request for the old query
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const q = (query || "").trim();
  if (q.length < 2) return null;

  const loadMore = async () => {
    if (!state.next || loadingMore) return;
    setLoadingMore(true);
    try {
      await run(state.loadedQuery, { page: state.page + 1, cursor: state.next });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="mt-8" aria-label="Live marketplace results">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-2xl">Live marketplace results</h2>
        <span className="text-sm text-ink3">real-time from Lazada · opens GadgetWise detail</span>
      </div>

      {/* GW-12: this is an independent marketplace search. It does not apply the
          catalog filters above, and it says how many listings IT returned. */}
      <p className="mt-1 text-sm text-ink2">
        Independent marketplace search — the catalog filters above do not apply here.
        {state.status === "ready" && ` ${state.items.length} live listing${state.items.length === 1 ? "" : "s"} found.`}
      </p>

      {state.status === "loading" && (
        <div className="mt-3 text-sm text-ink2 [overflow-wrap:anywhere]">Searching Lazada for “{q}”…</div>
      )}

      {state.status === "error" && (
        <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm text-ink2">
          <p className="[overflow-wrap:anywhere]">{state.error}</p>
          {/* GW-10: an explicit retry, not just a message. */}
          <button
            type="button"
            onClick={() => run(state.loadedQuery || q)}
            className="mt-3 rounded-sm border border-[#C7C7CC] bg-white px-3 py-1.5 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB]"
          >
            Retry search
          </button>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="mt-3 text-sm text-ink2 [overflow-wrap:anywhere]">No live listings found for “{q}”.</div>
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

      {/* GW-11: more pages load on demand, never automatically. */}
      {state.status === "ready" && state.next && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 rounded-sm border border-[#C7C7CC] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-60"
        >
          {loadingMore ? "Loading more…" : "Load more listings"}
        </button>
      )}
    </section>
  );
}

/** Append a page to the current list, deduped by productId. */
function mergeItems(current = [], incoming = []) {
  const seen = new Set(current.map((p) => p.productId));
  const out = current.slice();
  for (const p of incoming || []) {
    if (p?.productId && seen.has(p.productId)) continue;
    if (p?.productId) seen.add(p.productId);
    out.push(p);
  }
  return out;
}
