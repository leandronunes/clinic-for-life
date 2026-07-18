import { http } from "./http";
import type { CheckInFeedback } from "./check-in-feedbacks";

export type CheckInStatus = "in_progress" | "completed";

/** Quem realizou o check-in. Só "personal" conta no ciclo de atendimento do
 * personal — um check-in "aluno" só passa a contar se confirmado via
 * claimCheckIn(). */
export type CheckInPerformedBy = "aluno" | "personal";

export interface WorkoutCheckIn {
  id: string;
  workout_id: string;
  workout_title: string;
  student_id: string;
  student_name: string;
  status: CheckInStatus;
  performed_by: CheckInPerformedBy;
  exercises_completed: number;
  exercises_total: number;
  completed_exercise_ids: string[];
  started_at: string;
  completed_at: string | null;
  viewed_at: string | null;
  /** Percepção Subjetiva de Esforço (1-10, escala de Borg CR-10 simplificada
   * — ver src/lib/pse.ts). `null` até ser registrada; só pode ser definida
   * com o check-in já concluído. */
  pse: number | null;
  feedbacks: CheckInFeedback[];
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

export function fetchCompletedCheckIns(): Promise<WorkoutCheckIn[]> {
  return http.get<WorkoutCheckIn[]>("/api/v1/completed_check_ins");
}

export function markCheckInViewed(
  studentId: string,
  workoutId: string,
  checkInId: string,
): Promise<WorkoutCheckIn> {
  return http.post<WorkoutCheckIn>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/view`,
  );
}

/** Removes a check-in (completed or in progress) — the student themselves,
 * their personal, or an admin may do this (e.g. a check-in started by
 * mistake). Cascades to its exercise check-ins and feedback. Once a
 * check-in has been claimed by the personal (performed_by "personal"),
 * only staff (not the student) may still call this. */
export function deleteCheckIn(
  studentId: string,
  workoutId: string,
  checkInId: string,
): Promise<void> {
  return http.del<void>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}`,
  );
}

/** Registers the student's PSE (1-10) for a completed check-in — captured
 * once, right when the workout finishes. Safe to call again (no
 * "already set" guard on the backend), but the frontend never offers a
 * second chance once the capture dialog is closed. */
export function updateCheckInPse(
  studentId: string,
  workoutId: string,
  checkInId: string,
  pse: number,
): Promise<WorkoutCheckIn> {
  return http.patch<WorkoutCheckIn>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/pse`,
    { pse },
  );
}

/** Staff-only: confirms a check-in the student already did themselves,
 * making it count toward the personal's attendance cycle from now on.
 * Idempotent — claiming an already-claimed check-in just re-confirms it. */
export function claimCheckIn(
  studentId: string,
  workoutId: string,
  checkInId: string,
): Promise<WorkoutCheckIn> {
  return http.post<WorkoutCheckIn>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/claim`,
  );
}
