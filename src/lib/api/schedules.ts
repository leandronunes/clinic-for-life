import { http } from "./http";

/** Uma sessão agendada de treino (aula) no calendário. */
export interface ScheduleSession {
  id: string;
  student_id: string;
  student_name: string;
  trainer_id: string;
  trainer_name?: string | null;
  /** ISO com timezone (ex.: 2026-07-20T07:00:00-03:00). */
  starts_at: string;
  duration_minutes: number;
  status: "planned" | "done" | "missed" | "canceled";
  workout_id?: string | null;
  workout_check_in_id?: string | null;
  notes?: string | null;
  plan_id?: string | null;
}

export interface WeekdaySlot {
  /** 0 = domingo, 6 = sábado. */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** HH:mm 24h. */
  time: string;
  duration_minutes: number;
}

export interface SchedulePlanPayload {
  student_id: string;
  weekdays: WeekdaySlot[];
  /** YYYY-MM-DD. */
  starts_on: string;
  /** YYYY-MM-DD (inclusive). */
  ends_on: string;
  notes?: string | null;
}

export interface UpdateSessionPayload {
  starts_at?: string;
  duration_minutes?: number;
  status?: ScheduleSession["status"];
  notes?: string | null;
}

export interface FetchSessionsParams {
  from: string;
  to: string;
  trainerId?: string;
  studentId?: string;
}

export function fetchScheduleSessions(params: FetchSessionsParams): Promise<ScheduleSession[]> {
  return http.get<ScheduleSession[]>("/api/v1/schedule_sessions", {
    params: {
      from: params.from,
      to: params.to,
      trainer_id: params.trainerId,
      student_id: params.studentId,
    },
  });
}

export function createSchedulePlan(
  payload: SchedulePlanPayload,
): Promise<{ created: number; sessions: ScheduleSession[] }> {
  return http.post("/api/v1/schedule_plans", payload);
}

export function updateScheduleSession(
  id: string,
  payload: UpdateSessionPayload,
): Promise<ScheduleSession> {
  return http.patch<ScheduleSession>(`/api/v1/schedule_sessions/${id}`, payload);
}

export function deleteScheduleSession(id: string): Promise<void> {
  return http.del<void>(`/api/v1/schedule_sessions/${id}`);
}
