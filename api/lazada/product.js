// GET /api/lazada/product — TMAPI item-detail proxy; the key stays server-side
import { getLazadaKeys } from "../../lib/settings-crypto.js";
import {
  isValidProductId,
  normalizeMarketplace,
  buildProductUrl,
  fetchWithKeyFailover,
  normalizeProduct,
  isRealProduct,
  unwrap,
  mapUpstreamError,
} from "../../lib/lazada.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Use GET." } });
  }

  const keys = await getLazadaKeys(); // admin key first, then authorized env keys
  if (!keys.length) {
    return res.status(503).json({
      error: { code: "search_unavailable", message: "Product lookup is not available right now." },
    });
  }

  const productId = typeof req.query.id === "string" ? req.query.id.trim() : "";
  if (!isValidProductId(productId)) {
    return res.status(400).json({
      error: { code: "invalid_product_id", message: "A valid Lazada product id is required." },
    });
  }

  const marketplace = normalizeMarketplace(req.query.marketplace);
  if (!marketplace) {
    return res.status(400).json({
      error: { code: "invalid_marketplace", message: "marketplace must be one of ph, my, sg, th, vn, id." },
    });
  }

  const url = buildProductUrl({ productId, marketplace });
  let upstream;
  try {
    ({ upstream } = await fetchWithKeyFailover(url, keys));
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return res.status(504).json({
      error: timedOut
        ? { code: "upstream_timeout", message: "Lookup took too long. Please try again." }
        : { code: "upstream_unavailable", message: "Product lookup is temporarily unavailable." },
    });
  }

  const text = await upstream.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return res.status(502).json({
      error: { code: "upstream_bad_response", message: "Product lookup is temporarily unavailable." },
    });
  }

  if (!upstream.ok) {
    // 417 from item_detail ("Get item detail error") is ambiguous upstream
    // flakiness: the same listing can answer 200 moments later. It survived the
    // transient retry here, so report a retryable lookup failure with accurate
    // copy — never claim the listing is gone while it may still be live.
    if (upstream.status === 417) {
      return res.status(502).json({
        error: { code: "product_lookup_failed", message: "The marketplace did not return this listing right now. Please try again." },
        upstreamStatus: 417,
      });
    }
    const mapped = mapUpstreamError(upstream.status, body, Object.fromEntries(upstream.headers.entries()));
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message },
      upstreamStatus: upstream.status,
      // safe diagnostic: reason string only, never the key
      upstreamMessage: typeof body?.message === "string" ? body.message.slice(0, 160) : null,
    });
  }

  // A 2xx error-shaped body must not become a fake empty product.
  const un = unwrap(body);
  if (!un.ok) {
    return res.status(502).json({
      error: { code: "search_failed", message: "Product lookup failed. Please try again." },
      upstreamStatus: upstream.status,
    });
  }

  const product = normalizeProduct(un.data);
  if (!isRealProduct(product)) {
    return res.status(404).json({
      error: { code: "product_not_found", message: "That product could not be found." },
    });
  }

  return res.status(200).json({ product, cachedAt: new Date().toISOString() });
}
