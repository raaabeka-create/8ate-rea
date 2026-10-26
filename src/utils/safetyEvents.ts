/**
 * Refresh already-mounted views when the signed-in user's block list changes.
 * This same-tab UI signal is not a security control.
 */
export const BLOCKLIST_CHANGED_EVENT = '8ate:blocklist-changed';

export function notifyBlocklistChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BLOCKLIST_CHANGED_EVENT));
}

export function subscribeToBlocklistChanges(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(BLOCKLIST_CHANGED_EVENT, handler);
  return () => window.removeEventListener(BLOCKLIST_CHANGED_EVENT, handler);
}
