import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import { isMutuallyConfirmed } from "@/lib/check-in-confirmation";

export type AttendanceStatus = "no_contract" | "on_track" | "near_limit" | "exceeded";

export interface AttendanceCycle {
  /** Treinos concluídos considerados no ciclo atual. */
  completedInCycle: number;
  /** Quota contratada (repetida por conveniência); null quando não há contrato. */
  contracted: number | null;
  /** Data ISO do último check-in concluído dentro do ciclo (ou o mais recente, se sem contrato). */
  lastCompletedAt: string | null;
  /** Percentual concluído (0-100+). 0 quando não há contrato. */
  percentage: number;
  status: AttendanceStatus;
  /** Check-ins mutuamente confirmados (contam na quota) dentro do ciclo, do mais recente para o mais antigo. */
  checkInsInCycle: WorkoutCheckIn[];
  /** Check-ins já confirmados pelo aluno, aguardando o personal — o
   * personal tem uma ação disponível pra confirmar (ver confirmCheckIn). */
  pendingPersonalConfirmation: WorkoutCheckIn[];
  /** Check-ins já confirmados pelo personal, aguardando o aluno — read-only
   * na tela do personal, não há ação que ele possa tomar aqui. */
  pendingStudentConfirmation: WorkoutCheckIn[];
}

/**
 * Calcula o ciclo atual de treinos de um aluno.
 *
 * Um ciclo começa em `cycleStartedAt` (ou desde sempre, se nulo) e continua até
 * o personal renovar o contrato. Se o aluno ultrapassa a quota, o status vira
 * "exceeded" — o ciclo NÃO reinicia sozinho.
 */
export function computeAttendanceCycle(
  completedCheckIns: WorkoutCheckIn[],
  contracted: number | null | undefined,
  cycleStartedAt: string | null | undefined,
): AttendanceCycle {
  const startMs = cycleStartedAt ? Date.parse(cycleStartedAt) : Number.NEGATIVE_INFINITY;
  const withinCycle = completedCheckIns
    .filter((c) => c.status === "completed" && c.completed_at)
    .filter((c) => Date.parse(c.completed_at as string) >= startMs)
    .sort((a, b) => Date.parse(b.completed_at as string) - Date.parse(a.completed_at as string));

  // Só check-ins mutuamente confirmados consomem a quota — espelha
  // AttendanceCycle#completed_workouts no backend.
  const checkInsInCycle = withinCycle.filter(isMutuallyConfirmed);
  const pendingPersonalConfirmation = withinCycle.filter(
    (c) => c.student_confirmed_at && !c.personal_confirmed_at,
  );
  const pendingStudentConfirmation = withinCycle.filter(
    (c) => c.personal_confirmed_at && !c.student_confirmed_at,
  );

  const completedInCycle = checkInsInCycle.length;
  const lastCompletedAt = checkInsInCycle[0]?.completed_at ?? null;

  if (contracted == null || contracted <= 0) {
    return {
      completedInCycle,
      contracted: null,
      lastCompletedAt,
      percentage: 0,
      status: "no_contract",
      checkInsInCycle,
      pendingPersonalConfirmation,
      pendingStudentConfirmation,
    };
  }

  const percentage = Math.round((completedInCycle / contracted) * 100);
  const status: AttendanceStatus =
    completedInCycle > contracted ? "exceeded" : percentage >= 80 ? "near_limit" : "on_track";

  return {
    completedInCycle,
    contracted,
    lastCompletedAt,
    percentage,
    status,
    checkInsInCycle,
    pendingPersonalConfirmation,
    pendingStudentConfirmation,
  };
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  no_contract: "Sem contrato",
  on_track: "Em dia",
  near_limit: "Próximo do limite",
  exceeded: "Estourou",
};
