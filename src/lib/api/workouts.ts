import { http } from "./http";

export type WorkoutStatus = "active" | "archived";

export type ExerciseKind = "strength" | "cardio" | "mobility";
export type DistanceUnit = "m" | "km";
export type HrZone = 1 | 2 | 3 | 4 | 5;

export interface Exercise {
  id: string;
  position: number;
  /** Tipo do item. Omisso = "strength" para compat com dados legados. */
  kind?: ExerciseKind;
  name: string;
  // Força / Mobilidade
  sets?: number | null;
  reps?: string | null;
  load_kg?: number | null;
  rest_seconds?: number | null;
  muscle_group?: string | null;
  // Cardio
  duration_seconds?: number | null;
  distance_value?: number | null;
  distance_unit?: DistanceUnit | null;
  hr_zone?: HrZone | null;
  heart_rate_bpm?: string | null;
  // Compartilhado
  video_url: string;
  notes?: string | null;
}

export interface Workout {
  id: string;
  position: number;
  title: string;
  focus: string;
  status: WorkoutStatus;
  created_at: string;
  archived_at?: string | null;
  trainer_name: string;
  exercises: Exercise[];
}

export interface WorkoutList {
  active: Workout[];
  archived: Workout[];
}

export interface CreateWorkoutPayload {
  title: string;
  focus: string;
  trainer_name?: string;
}

export type UpdateWorkoutPayload = Partial<Pick<Workout, "title" | "focus">>;

export interface CreateExercisePayload {
  kind?: ExerciseKind;
  name: string;
  sets?: number;
  reps?: string;
  load_kg?: number;
  rest_seconds?: number;
  muscle_group?: string;
  duration_seconds?: number;
  distance_value?: number;
  distance_unit?: DistanceUnit;
  hr_zone?: HrZone;
  heart_rate_bpm?: string;
  video_url?: string;
  notes?: string;
}

export type UpdateExercisePayload = Partial<CreateExercisePayload>;

export async function fetchWorkouts(studentId: string): Promise<WorkoutList> {
  const all = await http.get<Workout[]>(`/api/v1/students/${studentId}/workouts`);
  return {
    active: all.filter((w) => w.status === "active").sort((a, b) => a.position - b.position),
    archived: all.filter((w) => w.status === "archived").sort((a, b) => b.position - a.position),
  };
}

export function createWorkout(studentId: string, payload: CreateWorkoutPayload): Promise<Workout> {
  return http.post<Workout>(`/api/v1/students/${studentId}/workouts`, payload);
}

export function updateWorkout(
  studentId: string,
  workoutId: string,
  payload: UpdateWorkoutPayload,
): Promise<Workout> {
  return http.patch<Workout>(`/api/v1/students/${studentId}/workouts/${workoutId}`, payload);
}

export function deleteWorkout(studentId: string, workoutId: string): Promise<null> {
  return http.del<null>(`/api/v1/students/${studentId}/workouts/${workoutId}`, {
    allowEmpty: true,
  });
}

export function archiveWorkout(studentId: string, workoutId: string): Promise<Workout> {
  return http.post<Workout>(`/api/v1/students/${studentId}/workouts/${workoutId}/archive`);
}

export function unarchiveWorkout(studentId: string, workoutId: string): Promise<Workout> {
  return http.post<Workout>(`/api/v1/students/${studentId}/workouts/${workoutId}/unarchive`);
}

export function createExercise(
  studentId: string,
  workoutId: string,
  payload: CreateExercisePayload,
): Promise<Exercise> {
  return http.post<Exercise>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/exercises`,
    payload,
  );
}

export function updateExercise(
  studentId: string,
  workoutId: string,
  exerciseId: string,
  payload: UpdateExercisePayload,
): Promise<Exercise> {
  return http.patch<Exercise>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/exercises/${exerciseId}`,
    payload,
  );
}

export function reorderWorkouts(studentId: string, orderedIds: string[]): Promise<Workout[]> {
  return http.patch<Workout[]>(`/api/v1/students/${studentId}/workouts/reorder`, {
    ordered_ids: orderedIds,
  });
}

export function reorderExercises(
  studentId: string,
  workoutId: string,
  orderedIds: string[],
): Promise<Exercise[]> {
  return http.patch<Exercise[]>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/exercises/reorder`,
    { ordered_ids: orderedIds },
  );
}

export function deleteExercise(
  studentId: string,
  workoutId: string,
  exerciseId: string,
): Promise<null> {
  return http.del<null>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/exercises/${exerciseId}`,
    { allowEmpty: true },
  );
}
