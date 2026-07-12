import { http } from "./http";

export type CheckInStatus = "in_progress" | "completed";

export interface WorkoutCheckIn {
  id: string;
  workout_id: string;
  workout_title: string;
  status: CheckInStatus;
  exercises_completed: number;
  exercises_total: number;
  completed_exercise_ids: string[];
  started_at: string;
  completed_at: string | null;
}

export function fetchCurrentCheckIn(
  studentId: string,
  workoutId: string,
): Promise<WorkoutCheckIn | null> {
  return http.get<WorkoutCheckIn | null>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/current`,
  );
}

export function startCheckIn(studentId: string, workoutId: string): Promise<WorkoutCheckIn> {
  return http.post<WorkoutCheckIn>(`/api/v1/students/${studentId}/workouts/${workoutId}/check_ins`);
}

export function finishCheckIn(
  studentId: string,
  workoutId: string,
  checkInId: string,
): Promise<WorkoutCheckIn> {
  return http.post<WorkoutCheckIn>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/finish`,
  );
}

export function toggleExerciseCheckIn(
  studentId: string,
  workoutId: string,
  checkInId: string,
  exerciseId: string,
  completed: boolean,
): Promise<WorkoutCheckIn> {
  return http.patch<WorkoutCheckIn>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/exercises/${exerciseId}`,
    { completed },
  );
}

export function fetchCheckInHistory(studentId: string): Promise<WorkoutCheckIn[]> {
  return http.get<WorkoutCheckIn[]>(`/api/v1/students/${studentId}/check_ins`);
}
