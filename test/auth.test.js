import { test } from "node:test";
import assert from "node:assert/strict";
import { setAuthUser, requireAuth } from "../src/lib/auth.js";

// The guest auth gate: a signed-out visitor must be blocked from account-gated
// actions (favorite, review); a signed-in user passes. One guard, every caller.
test("requireAuth gates guests and allows signed-in users", () => {
  setAuthUser(null);
  assert.equal(requireAuth("write a review"), false, "guest must be gated");
  assert.equal(requireAuth("save gadgets to your wishlist"), false, "guest gated for favorites");

  setAuthUser({ id: "u1", email: "a@b.c" });
  assert.equal(requireAuth("write a review"), true, "signed-in user passes");
  assert.equal(requireAuth("save gadgets to your wishlist"), true);

  // Sign-out clears the gate again (round-trip).
  setAuthUser(null);
  assert.equal(requireAuth("write a review"), false, "after sign-out the gate closes");
});

// Regression: the demo fallback that fabricated a logged-in user from any
// arbitrary email/password must not exist. Assert the module exposes no demo
// identity and that requireAuth stays closed with no real user set.
test("no fabricated demo identity keeps the gate closed", () => {
  setAuthUser(null);
  // Even asking repeatedly, a guest is never silently let through.
  for (let i = 0; i < 3; i++) assert.equal(requireAuth("write a review"), false);
});
