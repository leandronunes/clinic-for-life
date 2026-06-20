import { http } from "./http";

export interface Anamnesis {
  objectives?: string | null;
  medicines?: string | null;
  supplements?: string | null;
  systolic_pressure?: number | null;
  diastolic_pressure?: number | null;
  variable_glycemia?: number | null;
  notes?: string | null;
  height?: number | null;
  weight?: number | null;
  fracture?: string | null;
  dislocations?: string | null;
  pain?: string | null;
  orthopedic_notes?: string | null;
  meals?: number | null;
  hydration?: string | null;
  sleep?: string | null;
  stool?: string | null;
  urine?: string | null;
}

export type UpdateAnamnesisPayload = Partial<Anamnesis>;

export function fetchAnamnesis(studentId: string): Promise<Anamnesis> {
  return http.get<Anamnesis>(`/api/v1/students/${studentId}/anamnesis`);
}

export function updateAnamnesis(
  studentId: string,
  payload: UpdateAnamnesisPayload,
): Promise<Anamnesis> {
  return http.put<Anamnesis>(`/api/v1/students/${studentId}/anamnesis`, payload);
}
