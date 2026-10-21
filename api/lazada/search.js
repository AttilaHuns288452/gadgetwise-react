/**
 * GET /api/lazada/search?q=<query>&marketplace=ph&page=1
 *
 * Serverless proxy for the TMAPI Lazada search API. The API key lives in the
 * OMKAR_LAZADA_API_KEY env var (kept name-compatible) and never reaches the
 * browser. Returns normalized product data plus an explicit freshness marker.
 */
import {
  normalizeQuery,
  normalizeMarketplace,
  normalizePage,
  buildSearchUrl,
  buildAuthHeaders,
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

  const key = process.env.OMKAR_LAZADA_API_KEY;
  if (!key) {
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
  const cacheKey = `${marketplace}|${page}|${query.toLowerCase()}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    res.setHeader("X-Cache", "hit");
    return res.status(200).json({ ...cached.data, cachedAt: new Date(cached.at).toISOString(), cache: "hit" });
  }

  const url = buildSearchUrl({ query, marketplace, page });
  let upstream;
  try {
    upstream = await fetch(url, {
      headers: buildAuthHeaders(key),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return res.status(504).json({
      error: timedOut
        ? { code: "upstream_timeout", message: "Search took too long. Please try again." }
        : { code: "upstream_unavailable", message: "Product search is temporarily unavailable. Please try again." },
    });
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
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message },
      upstreamStatus: upstream.status,
    });
  }

  // A 2xx error-shaped body must not become a fake empty result set.
  const un = unwrap(body);
  if (!un.ok) {
    return res.status(502).json({
      error: { code: "search_failed", message: "Product search failed. Please try again." },
      upstreamStatus: upstream.status,
    });
  }

  const data = normalizeSearchResponse(body);
  const now = Date.now();
  CACHE.set(cacheKey, { at: now, data });
  if (CACHE.size > 200) {
    // ponytail: crude bound; drop oldest key rather than a real LRU.
    CACHE.delete(CACHE.keys().next().value);
  }

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
  res.setHeader("X-Cache", "miss");
  return res.status(200).json({ ...data, cachedAt: new Date(now).toISOString(), cache: "miss" });
}
