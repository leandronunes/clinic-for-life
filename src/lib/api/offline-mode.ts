/**
 * Reads the `VITE_OFFLINE` flag. When enabled, `@/lib/api/http` serves every
 * request from the in-memory mock dataset in `@/lib/api/mock` instead of
 * calling the real Rails API — useful for local frontend work without
 * backend access.
 */
export function isOfflineMode(): boolean {
  const raw = import.meta.env?.VITE_OFFLINE as string | undefined;
  return raw?.trim().toLowerCase() === "true";
}
