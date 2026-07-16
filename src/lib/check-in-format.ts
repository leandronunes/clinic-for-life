import type { WorkoutCheckIn } from "@/lib/api/check-ins";

/** When a check-in "effectively" happened — its completion time if it has
 * one, otherwise when it started (e.g. one still in progress). Used to sort/
 * group check-ins and as the date shown next to them. */
export function checkInEffectiveDate(checkIn: WorkoutCheckIn): Date {
  return new Date(checkIn.completed_at ?? checkIn.started_at);
}

/** pt-BR "dd/MM hh:mm" (optionally "dd/MM/yyyy hh:mm") — the day/time format
 * used throughout the check-in review screens. */
export function formatCheckInDateTime(date: Date, options: { withYear?: boolean } = {}): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(options.withYear ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Percentage of a workout's exercises completed in this check-in. Accepts
 * null/undefined so callers can pass a possibly-unselected check-in
 * directly without a separate guard. */
export function checkInCompletionPercentage(
  checkIn: Pick<WorkoutCheckIn, "exercises_completed" | "exercises_total"> | null | undefined,
): number {
  if (!checkIn || !checkIn.exercises_total) return 0;
  return Math.round((checkIn.exercises_completed / checkIn.exercises_total) * 100);
}
