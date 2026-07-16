import { isSameDay } from "date-fns";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";

/**
 * The workout the aluno most recently completed, across all history — used
 * both to badge that workout's tab and to compute the next one in rotation.
 * Returns null when nothing has ever been completed.
 */
export function findLastExecutedWorkoutId(checkIns: readonly WorkoutCheckIn[]): string | null {
  let latest: WorkoutCheckIn | null = null;
  for (const c of checkIns) {
    if (c.status !== "completed" || !c.completed_at) continue;
    if (!latest || new Date(c.completed_at) > new Date(latest.completed_at as string)) {
      latest = c;
    }
  }
  return latest?.workout_id ?? null;
}

/**
 * The workout the aluno should land on when opening "Meu Treino": the first
 * one after the last-executed workout (in tab/position order) that hasn't
 * been completed today yet — wrapping circularly, so finishing the last
 * workout in the list starts back at the first. Falls back to the first
 * workout when there's no execution history yet, or the last executed
 * workout isn't in this list (e.g. archived since, or viewing "Arquivados").
 */
export function computeDefaultWorkoutId(
  workouts: readonly { id: string }[],
  checkIns: readonly WorkoutCheckIn[],
  today: Date = new Date(),
): string | null {
  if (workouts.length === 0) return null;

  const lastExecutedWorkoutId = findLastExecutedWorkoutId(checkIns);
  const lastIdx = workouts.findIndex((w) => w.id === lastExecutedWorkoutId);
  if (lastIdx === -1) return workouts[0].id;

  const doneToday = new Set(
    checkIns
      .filter(
        (c) =>
          c.status === "completed" && c.completed_at && isSameDay(new Date(c.completed_at), today),
      )
      .map((c) => c.workout_id),
  );

  for (let i = 1; i <= workouts.length; i++) {
    const candidate = workouts[(lastIdx + i) % workouts.length];
    if (!doneToday.has(candidate.id)) return candidate.id;
  }
  // Every workout (including the last executed one) was already completed
  // today — just move to the next one in rotation regardless.
  return workouts[(lastIdx + 1) % workouts.length].id;
}
