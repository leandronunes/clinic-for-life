import type { WorkoutCheckIn } from "@/lib/api/check-ins";

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
  /** Check-ins do personal (contam na quota) dentro do ciclo, do mais recente para o mais antigo. */
  checkInsInCycle: WorkoutCheckIn[];
  /** Check-ins que o próprio aluno fez dentro do ciclo e o personal ainda não confirmou —
   * não contam na quota até serem confirmados (ver claimCheckIn). */
  pendingClaimCheckIns: WorkoutCheckIn[];
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

  // Só check-ins feitos/confirmados pelo personal consomem a quota — espelha
  // AttendanceCycle#completed_workouts no backend.
  const checkInsInCycle = withinCycle.filter((c) => c.performed_by === "personal");
  const pendingClaimCheckIns = withinCycle.filter((c) => c.performed_by === "aluno");

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
      pendingClaimCheckIns,
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
    pendingClaimCheckIns,
  };
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  no_contract: "Sem contrato",
  on_track: "Em dia",
  near_limit: "Próximo do limite",
  exceeded: "Estourou",
};
