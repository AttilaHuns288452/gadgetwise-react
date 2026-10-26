// check-moderation.mjs — one-command proof that review moderation works.
//
//   GW_TEST_EMAIL=... GW_TEST_PASSWORD=... node check-moderation.mjs
//
// Runs the forbidden-word battery as a real signed-in non-admin against the
// project in .env.local. Creates and removes its own test review rows.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const EMAIL = process.env.GW_TEST_EMAIL;
// the admin seeds these two in the Forbidden words tab first:
const WORD = process.env.GW_TEST_WORD;
const PHRASE = process.env.GW_TEST_PHRASE;
const PW = process.env.GW_TEST_PASSWORD;
if (!URL || !ANON || !EMAIL || !PW || !WORD) {
  console.error("usage: GW_TEST_EMAIL=... GW_TEST_PASSWORD=... GW_TEST_WORD=... [GW_TEST_PHRASE=...] node check-moderation.mjs");
  process.exit(2);
}
const res = [];
const t = (n, ok, d = "") => { res.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };

const tokRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PW }),
});
const tok = (await tokRes.json()).access_token;
if (!tok) { console.error("sign-in failed"); process.exit(2); }
const H = { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };

const rpc = async (fn, args) => {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const rejects = (r) => r.body && r.body.ok === false && /not allowed/i.test(r.body.error || "");
const accepts = (r) => r.body && r.body.ok === true;

t("forbidden word rejected", rejects(await rpc("submit_review", { p_gadget_id: "qa-check", p_rating: 5, p_body: `this has ${WORD} in it` })));
t("case + punctuation variant rejected", rejects(await rpc("submit_review", { p_gadget_id: "qa-check", p_rating: 5, p_body: `${WORD.toUpperCase()}!! no thanks` })));
if (PHRASE) t("forbidden phrase (hyphens) rejected", rejects(await rpc("submit_review", { p_gadget_id: "qa-check", p_rating: 5, p_body: PHRASE.split(/\s+/).join("-") + " here" })));
t("substring is not a false positive", accepts(await rpc("submit_review", { p_gadget_id: "qa-check", p_rating: 5, p_body: `xx${WORD}yy is fine` })));
t("legitimate negative review passes", accepts(await rpc("submit_review", { p_gadget_id: "qa-check", p_rating: 2, p_body: "Terrible battery life, do not buy" })));

// RLS: a non-admin may not read or write the moderation list or the log
const rl = await fetch(`${URL}/rest/v1/forbidden_words?select=phrase`, { headers: H });
const al = await fetch(`${URL}/rest/v1/activity_log?select=action`, { headers: H });
const forge = await fetch(`${URL}/rest/v1/activity_log`, { method: "POST", headers: H, body: JSON.stringify({ action: "forged" }) });
t("non-admin cannot see forbidden words", (await rl.json()).length === 0);
t("non-admin cannot see the activity log", (await al.json()).length === 0);
t("non-admin cannot forge log entries", forge.status >= 400);

// cleanup the rows this run created
const del = await fetch(`${URL}/rest/v1/reviews?gadget_id=eq.qa-check`, { method: "DELETE", headers: H });
t("test rows cleaned up", del.status < 300);

const fails = res.filter((r) => !r).length;
console.log(`\n${res.length - fails}/${res.length} checks pass`);
process.exit(fails ? 1 : 0);
