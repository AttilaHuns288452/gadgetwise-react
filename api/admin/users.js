// GET /api/admin/users. Admin-only: the caller's verified JWT is resolved to a
// user and checked against admin_users before the service-role key is used.
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: { code: "method_not_allowed", message: "Use GET." } });
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return res.status(503).json({ error: { code: "not_configured", message: "Supabase is not configured." } });
  }

  // Caller identity comes from their bearer token.
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Sign in required." } });
  }

  // Resolve the caller with the anon client scoped to their token. This never
  // trusts a client-supplied user id: the id is derived from the verified JWT.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId;
  try {
    const { data, error } = await asUser.auth.getUser();
    if (error || !data?.user) {
      return res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired session." } });
    }
    userId = data.user.id;
  } catch {
    return res.status(401).json({ error: { code: "unauthorized", message: "Invalid or expired session." } });
  }

  // Authorize: must be the designated admin (DB-enforced, not a client flag).
  try {
    const { data: adminRow, error: adminErr } = await asUser.rpc("is_admin");
    if (adminErr || adminRow !== true) {
      return res.status(403).json({ error: { code: "forbidden", message: "Admin access required." } });
    }
  } catch {
    return res.status(403).json({ error: { code: "forbidden", message: "Admin access required." } });
  }

  // Authorized. Now, and only now, use the service role to list real users.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Role source of truth: which auth users are in admin_users.
  const { data: adminRows } = await admin.from("admin_users").select("user_id");
  const adminIds = new Set((adminRows || []).map((r) => r.user_id));
  const users = [];
  let page = 1;
  try {
    // Page through auth users (bounded - cap to avoid unbounded fan-out).
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const list = data?.users || [];
      for (const u of list) {
        users.push({
          id: u.id,
          email: u.email || "",
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at || null,
          confirmed: Boolean(u.email_confirmed_at),
          isAdmin: adminIds.has(u.id),
        });
      }
      if (list.length < 200 || page >= 10) break;
      page += 1;
    }
  } catch {
    return res.status(502).json({ error: { code: "upstream_error", message: "Could not load users." } });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ users, checkedBy: userId });
}
