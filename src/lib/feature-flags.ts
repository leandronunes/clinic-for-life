/**
 * Feature flags for developing new features hidden from real users until
 * they're ready to be released. Each flag reads its own `VITE_FEATURE_*`
 * environment variable and defaults to hidden (`false`) unless it's
 * explicitly set to "true" — the opposite default of most env flags, since
 * the whole point is to keep in-progress work invisible until switched on.
 *
 * To add a new hidden feature: add its key to `FeatureFlag` and its env var
 * name to `ENV_VARS` below, then gate the relevant UI with
 * `isFeatureEnabled("theNewFlag")`. Once the feature is ready for everyone,
 * remove the flag and the gating code — it's meant to be temporary.
 */
export type FeatureFlag = "attendanceCycles" | "agendaCalendar" | "chat" | "passwordReset";

const ENV_VARS: Record<FeatureFlag, string> = {
  attendanceCycles: "VITE_FEATURE_ATTENDANCE_CYCLES",
  agendaCalendar: "VITE_FEATURE_AGENDA_CALENDAR",
  chat: "VITE_FEATURE_CHAT",
  passwordReset: "VITE_FEATURE_PASSWORD_RESET",
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const raw = import.meta.env?.[ENV_VARS[flag]] as string | undefined;
  return raw?.trim().toLowerCase() === "true";
}
