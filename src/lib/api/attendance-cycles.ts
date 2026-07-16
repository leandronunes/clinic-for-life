import { http } from "./http";
import type { Student } from "./students";

export type AttendanceCycleStatus = "completed" | "exceeded";

export interface AttendanceCycleRecord {
  id: string;
  student_id: string;
  contracted_workouts_per_cycle: number;
  completed_workouts: number;
  percentage: number;
  status: AttendanceCycleStatus;
  started_at: string;
  ended_at: string;
}

/** Ciclos de assiduidade já encerrados do aluno, do mais recente para o mais antigo. */
export function fetchAttendanceCycleHistory(studentId: string): Promise<AttendanceCycleRecord[]> {
  return http.get<AttendanceCycleRecord[]>(`/api/v1/students/${studentId}/attendance_cycles`);
}

/**
 * Arquiva o ciclo atual do aluno como um AttendanceCycle e reinicia a
 * contagem a partir de agora. Requer papel admin/personal — ver "Renovar
 * ciclo" em `_app.assiduidade-alunos.tsx`.
 */
export function renewAttendanceCycle(studentId: string): Promise<Student> {
  return http.post<Student>(`/api/v1/students/${studentId}/renew_cycle`);
}
