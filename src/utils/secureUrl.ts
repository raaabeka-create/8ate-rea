/**
 * Accept only absolute HTTPS URLs with a non-empty host.
 * This is input validation, not a guarantee that the remote resource is safe or trustworthy.
 */
export function isSecureHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}
