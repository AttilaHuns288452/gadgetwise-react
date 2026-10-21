/**
 * GET /api/lazada/product?id=<product_id>&marketplace=ph
 *
 * Serverless proxy for the OmkarCloud Lazada product snapshot. The upstream
 * API key stays server-side in OMKAR_LAZADA_API_KEY.
 */
import {
  isValidProductId,
  normalizeMarketplace,
  buildProductUrl,
  normalizeProduct,
  isRealProduct,
  isErrorBody,
  mapUpstreamError,
} from "../../lib/lazada.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Use GET." } });
  }

  const key = process.env.OMKAR_LAZADA_API_KEY;
  if (!key) {
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
    upstream = await fetch(url, {
      headers: { "API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
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
    const mapped = mapUpstreamError(upstream.status, body, Object.fromEntries(upstream.headers.entries()));
    return res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
  }

  // A 2xx that is actually an error body must not become a fake empty product.
  if (isErrorBody(body)) {
    const mapped = mapUpstreamError(400, body, {});
    return res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
  }

  // Upstream may wrap the product in { product: {...} } or return it bare.
  const raw = body?.product ?? body;
  const product = normalizeProduct(raw);

  // If we got no recognizable product, that is a not-found, not a success.
  if (!isRealProduct(product)) {
    return res.status(404).json({
      error: { code: "product_not_found", message: "That product could not be found." },
    });
  }

  return res.status(200).json({ product, cachedAt: new Date().toISOString() });
}
