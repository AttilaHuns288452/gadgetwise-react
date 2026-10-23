/**
 * GET /api/lazada/search?q=<query>&marketplace=ph&page=1
 *
 * Serverless proxy for the TMAPI Lazada search API. The API key lives in the
 * OMKAR_LAZADA_API_KEY env var (kept name-compatible) and never reaches the
 * browser. Returns normalized product data plus an explicit freshness marker.
 */
import { createClient } from "@supabase/supabase-js";
import { getLazadaKeys } from "../../lib/settings-crypto.js";

// Shared snapshot cache: the provider is quota-metered, so a successful fetch is
// persisted and later served (marked stale) when the provider is unavailable.
// Real marketplace rows with a timestamp — never invented products.
function snapshotClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function snapshotWrite(key, data) {
  try {
    await snapshotClient()?.from("catalog_cache").upsert(
      { cache_key: key, payload: data, fetched_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    );
  } catch {
    /* snapshot is best-effort; never fail the live response over it */
  }
}

async function snapshotRead(key) {
  try {
    const { data } = await snapshotClient()?.from("catalog_cache").select("payload, fetched_at").eq("cache_key", key).maybeSingle();
    return data?.payload ? { data: data.payload, fetchedAt: data.fetched_at } : null;
  } catch {
    return null;
  }
}

// On any provider failure, fall back to the last real snapshot before erroring.
async function staleOrError(res, key, status, body, reason) {
  const snap = await snapshotRead(key);
  if (snap) {
    return res.status(200).json({
      ...snap.data,
      stale: true,
      staleFrom: snap.fetchedAt,
      staleReason: reason,
      cache: "snapshot",
    });
  }
  return res.status(status).json(body);
}
import {
  normalizeQuery,
  normalizeMarketplace,
  normalizePage,
  buildSearchUrl,
  fetchWithKeyFailover,
  normalizeSearchResponse,
  unwrap,
  mapUpstreamError,
} from "../../lib/lazada.js";

// ponytail: in-memory TTL cache per warm lambda instance. Resets on cold start
// and is not shared across instances. Fine at low volume; move to KV if needed.
const CACHE = new Map();
const TTL_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Use GET." } });
  }

  const keys = await getLazadaKeys(); // admin key first, then authorized env keys
  if (!keys.length) {
    return res.status(503).json({
      error: { code: "search_unavailable", message: "Product search is not available right now." },
    });
  }

  const query = normalizeQuery(req.query.q ?? req.query.search_query);
  if (!query) {
    return res.status(400).json({
      error: { code: "invalid_query", message: "Enter a search term between 2 and 120 characters." },
    });
  }

  const marketplace = normalizeMarketplace(req.query.marketplace);
  if (!marketplace) {
    return res.status(400).json({
      error: { code: "invalid_marketplace", message: "marketplace must be one of ph, my, sg, th, vn, id." },
    });
  }

  const page = normalizePage(req.query.page);
  const startKey = typeof req.query.start_key === "string" ? req.query.start_key.trim() : "";
  const cacheKey = `${marketplace}|${page}|${startKey}|${query.toLowerCase()}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    res.setHeader("X-Cache", "hit");
    return res.status(200).json({ ...cached.data, cachedAt: new Date(cached.at).toISOString(), cache: "hit" });
  }

  const url = buildSearchUrl({ query, marketplace, page, startKey });
  let upstream;
  try {
    ({ upstream } = await fetchWithKeyFailover(url, keys));
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return staleOrError(res, cacheKey, 504, {
      error: timedOut
        ? { code: "upstream_timeout", message: "Search took too long. Please try again." }
        : { code: "upstream_unavailable", message: "Product search is temporarily unavailable. Please try again." },
    }, timedOut ? "provider timeout" : "provider unavailable");
  }

  const text = await upstream.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return res.status(502).json({
      error: { code: "upstream_bad_response", message: "Product search is temporarily unavailable. Please try again." },
    });
  }

  if (!upstream.ok) {
    const mapped = mapUpstreamError(upstream.status, body, Object.fromEntries(upstream.headers.entries()));
    if (mapped.retryAfter) res.setHeader("Retry-After", String(mapped.retryAfter));
    return staleOrError(res, cacheKey, mapped.status, {
      error: { code: mapped.code, message: mapped.message },
      upstreamStatus: upstream.status,
      // safe diagnostic: reason string only, never the key
      upstreamMessage: typeof body?.message === "string" ? body.message.slice(0, 160) : null,
    }, mapped.code);
  }

  // A 2xx error-shaped body must not become a fake empty result set.
  const un = unwrap(body);
  if (!un.ok) {
    return staleOrError(res, cacheKey, 502, {
      error: { code: "search_failed", message: "Product search failed. Please try again." },
      upstreamStatus: upstream.status,
    }, "provider returned an unusable response");
  }

  const data = normalizeSearchResponse(body);
  const now = Date.now();
  CACHE.set(cacheKey, { at: now, data });
  // must be awaited: a fire-and-forget write is frozen when the serverless
  // response returns, which left the snapshot permanently empty
  await snapshotWrite(cacheKey, data);
  if (CACHE.size > 200) {
    // ponytail: crude bound; drop oldest key rather than a real LRU.
    CACHE.delete(CACHE.keys().next().value);
  }

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
  res.setHeader("X-Cache", "miss");
  return res.status(200).json({ ...data, cachedAt: new Date(now).toISOString(), cache: "miss" });
}
