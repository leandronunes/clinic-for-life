import type { QueryClient } from "@tanstack/react-query";
import type { Exercise, Workout, WorkoutList } from "@/lib/api/workouts";

/**
 * Patches an exercise change directly into the ["treinos", alunoId] cache
 * entry so the list reflects it immediately. `invalidateQueries` alone also
 * schedules a refetch, but its background result doesn't reliably trigger a
 * re-render on this page — writing the known result straight into the cache
 * sidesteps that.
 */
export function patchWorkoutExercises(
  qc: QueryClient,
  alunoId: string,
  treinoId: string,
  updater: (exercises: Exercise[]) => Exercise[],
) {
  qc.setQueryData<WorkoutList>(["treinos", alunoId], (old) => {
    if (!old) return old;
    const patch = (list: Workout[]) =>
      list.map((w) => (w.id === treinoId ? { ...w, exercises: updater(w.exercises) } : w));
    return { active: patch(old.active), archived: patch(old.archived) };
  });
}
