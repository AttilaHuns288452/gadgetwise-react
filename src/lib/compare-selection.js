/**
 * Comparison selection contract.
 *
 * The selection is authoritative in the Compare page: a ?ids= link owns it,
 * the compare tray fills it when there is no link, and the last selection is
 * remembered so a refresh does not empty the table. The resolution is a pure
 * function in its own module so it stays unit-testable without a DOM (the
 * page itself is JSX and cannot be imported by the node test runner).
 */
export function resolveSelection({ hasLinkParam, linkIds, trayIds, savedIds }) {
  // The link owns the selection even when it is empty: /compare?ids= means
  // "nothing selected", not "fall back to whatever was there before".
  if (hasLinkParam) return linkIds;
  if (trayIds.length) return trayIds;
  return savedIds;
}
