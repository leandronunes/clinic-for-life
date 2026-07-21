import type { WorkoutCheckIn } from "@/lib/api/check-ins";

type ConfirmationFields = Pick<WorkoutCheckIn, "student_confirmed_at" | "personal_confirmed_at">;

/** Um check-in só conta no ciclo de atendimento do personal quando as duas
 * partes confirmaram — espelha AttendanceCycle#completed_workouts. */
export function isMutuallyConfirmed(checkIn: ConfirmationFields): boolean {
  return !!checkIn.student_confirmed_at && !!checkIn.personal_confirmed_at;
}

/** Se falta o lado do viewer confirmar este check-in — usado para decidir
 * se mostra o botão "Confirmar" (nunca mostra pro lado que já confirmou,
 * nem oferece confirmar em nome do outro lado). */
export function needsConfirmationFrom(
  checkIn: ConfirmationFields,
  viewerIsStaff: boolean,
): boolean {
  return viewerIsStaff ? !checkIn.personal_confirmed_at : !checkIn.student_confirmed_at;
}
