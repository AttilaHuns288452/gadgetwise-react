/**
 * GET /api/lazada/usage
 *
 * Proxies OmkarCloud's free /account/usage endpoint (never consumes a request).
 * Returns the plan and remaining quota so the app can show usage, and so we can
 * tell an invalid key from an upstream outage. The API key stays server-side.
 */
import { UPSTREAM, mapUpstreamError } from "../../lib/lazada.js";

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

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM}/account/usage`, {
      headers: { "API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return res.status(504).json({ error: { code: "upstream_unavailable", message: "Could not reach the product data provider." } });
  }

  const text = await upstream.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    // safe diagnostic: shape only, never the body text (it could echo the key)
    return res.status(502).json({
      error: { code: "upstream_bad_response", message: "Product data provider returned an unexpected response." },
      upstreamStatus: upstream.status,
    });
  }

  if (!upstream.ok) {
    const mapped = mapUpstreamError(upstream.status, body, {});
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message },
      upstreamStatus: upstream.status,
      upstreamCode: typeof body?.code === "string" ? body.code : null,
    });
  }

  // Return only non-sensitive usage fields (never the key).
  return res.status(200).json({
    plan: body?.plan ?? null,
    status: body?.status ?? null,
    requestsLimit: body?.requests_limit ?? null,
    requestsUsed: body?.requests_used ?? null,
    requestsRemaining: body?.requests_remaining ?? null,
    renewsAt: body?.renews_at ?? null,
  });
}
