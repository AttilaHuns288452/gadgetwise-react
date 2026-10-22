import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/--.*$/gm, "");

// Privacy boundary for public reviewer profiles (mission section 6): a public
// profile may expose only display name + approved reviews — never email, auth
// metadata, wishlist, or comparison history. Comments may discuss these (to
// document the boundary); the check strips comments and inspects real code.
test("public_profiles view exposes no private columns", () => {
  const sql = stripComments(readFileSync("supabase/migrations/0005_public_profiles.sql", "utf8"));
  assert.ok(!/\bemail\b/i.test(sql), "public_profiles view must not select email");
  assert.ok(!/auth\./i.test(sql), "view must not surface auth metadata");
  assert.ok(/display_name/i.test(sql), "view exposes display_name");
});

test("PublicProfile page renders no private fields", () => {
  const page = stripComments(readFileSync("src/pages/PublicProfile.jsx", "utf8"));
  for (const leak of ["email", "wishlist", "comparison_history", "password"]) {
    assert.ok(!new RegExp(leak, "i").test(page), `PublicProfile must not render ${leak}`);
  }
  assert.ok(/display_name/.test(page), "PublicProfile renders the public display name");
});

test("review author link points at the public profile route", () => {
  const detail = readFileSync("src/pages/GadgetDetail.jsx", "utf8");
  assert.ok(/to=\{`\/u\/\$\{r\.user_id\}`\}/.test(detail), "review author links to /u/:userId");
});
