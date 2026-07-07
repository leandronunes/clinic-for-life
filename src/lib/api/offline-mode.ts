/**
 * Reads the `VITE_OFFLINE` flag. When enabled, `@/lib/api/http` serves every
 * request from the in-memory mock dataset in `@/lib/api/mock` instead of
 * calling the real Rails API — useful for local frontend work without
 * backend access.
 *
 * Defaults to `true` when the variable is unset, so the app still runs
 * (against mock data) rather than failing against an unconfigured API.
 * Set `VITE_OFFLINE=false` explicitly to use the real backend.
 */
export function isOfflineMode(): boolean {
  const raw = import.meta.env?.VITE_OFFLINE as string | undefined;
  if (raw === undefined || raw.trim() === "") return true;
  return raw.trim().toLowerCase() !== "false";
}
