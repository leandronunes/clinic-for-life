import { http } from "./http";
import type { BioimpedanceMeasurement } from "./bioimpedance";

export interface BioImportResult {
  imported: number;
  errors: string[];
  preview: BioimpedanceMeasurement[];
}

export function importBioimpedanceCsv(studentId: string, file: File): Promise<BioImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("student_id", studentId);
  return http.post<BioImportResult>("/api/v1/bioimpedance/import", form);
}
