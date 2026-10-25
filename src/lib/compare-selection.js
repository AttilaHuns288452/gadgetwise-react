// Which selection wins: ?ids= link, else the tray, else the last one saved.
export function resolveSelection({ hasLinkParam, linkIds, trayIds, savedIds }) {
  // an empty ?ids= means "nothing selected", not "fall back to saved"
  if (hasLinkParam) return linkIds;
  if (trayIds.length) return trayIds;
  return savedIds;
}
