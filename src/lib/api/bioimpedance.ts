import { http } from "./http";

export interface BioimpedanceMeasurement {
  id: string;
  student_id: string;
  measured_on: string;
  weight_kg: number;
  muscle_mass_kg: number;
  fat_percentage: number;
  visceral_fat?: number | null;
  bmi: number;
  source: "manual" | "import";
  photo_id?: string | null;
  photo_url?: string | null;
}

export interface CreateMeasurementPayload {
  measured_on: string;
  weight_kg: number;
  muscle_mass_kg: number;
  fat_percentage: number;
  visceral_fat?: number;
  bmi: number;
}

export function fetchMeasurements(studentId: string): Promise<BioimpedanceMeasurement[]> {
  return http.get<BioimpedanceMeasurement[]>(
    `/api/v1/students/${studentId}/bioimpedance_measurements`,
  );
}

export function createMeasurement(
  studentId: string,
  payload: CreateMeasurementPayload,
): Promise<BioimpedanceMeasurement> {
  return http.post<BioimpedanceMeasurement>(
    `/api/v1/students/${studentId}/bioimpedance_measurements`,
    payload,
  );
}
