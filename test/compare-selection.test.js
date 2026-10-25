import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSelection } from "../src/lib/compare-selection.js";

/**
 * The comparison selection contract (GW-26 / GW-27).
 *
 * The selection is authoritative in Compare: a ?ids= link owns it, the tray
 * fills it when there is no link, and the last selection is remembered so a
 * refresh does not empty the table. The resolution is a pure function so it
 * can be asserted without a DOM.
 */
test("a ?ids= link owns the selection", () => {
  assert.deepEqual(
    resolveSelection({
      hasLinkParam: true,
      linkIds: ["a", "b"],
      trayIds: ["x", "y"],
      savedIds: ["old"],
    }),
    ["a", "b"],
    "the link wins over the tray and the stored selection",
  );
});

test("an empty ?ids= link means nothing selected", () => {
  // /compare?ids= is "nothing selected", not "fall back to what was there".
  assert.deepEqual(
    resolveSelection({ hasLinkParam: true, linkIds: [], trayIds: ["x"], savedIds: ["old"] }),
    [],
  );
});

test("the compare tray drives the selection when there is no link", () => {
  assert.deepEqual(
    resolveSelection({ hasLinkParam: false, linkIds: [], trayIds: ["x", "y"], savedIds: ["old"] }),
    ["x", "y"],
  );
});

test("the stored selection is the fallback, so a refresh keeps the table", () => {
  // The tray lives in React state and dies on reload: without this the
  // comparison empties itself on every refresh.
  assert.deepEqual(
    resolveSelection({ hasLinkParam: false, linkIds: [], trayIds: [], savedIds: ["a", "b"] }),
    ["a", "b"],
  );
});

test("nothing selected anywhere means an empty selection", () => {
  assert.deepEqual(
    resolveSelection({ hasLinkParam: false, linkIds: [], trayIds: [], savedIds: [] }),
    [],
  );
});
