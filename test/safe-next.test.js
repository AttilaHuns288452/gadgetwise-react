import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../src/lib/auth.js";

test("post-auth destination never becomes an open redirect", () => {
  // legitimate same-app destinations survive
  assert.equal(safeNext("/gadgets?cat=laptops"), "/gadgets?cat=laptops");
  assert.equal(safeNext("/profile"), "/profile");
  assert.equal(safeNext("/"), "/");
  // protocol-relative and absolute URLs must fall back
  assert.equal(safeNext("//evil.example"), "/profile");
  assert.equal(safeNext("https://evil.example"), "/profile");
  assert.equal(safeNext("http://evil.example"), "/profile");
  assert.equal(safeNext("javascript:alert(1)"), "/profile");
  assert.equal(safeNext("///evil.example"), "/profile");
  // missing / empty values fall back too
  assert.equal(safeNext(""), "/profile");
  assert.equal(safeNext(null), "/profile");
  assert.equal(safeNext(undefined), "/profile");
});
