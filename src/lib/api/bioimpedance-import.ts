import { http } from "./http";
import type { BioimpedanceMeasurement } from "./bioimpedance";

export interface BioImportResult {
  imported: number;
  errors: string[];
  preview: BioimpedanceMeasurement[];
}

/** Accepts either a raw InBody CSV export or a mynutri/InBody PDF report —
 * the backend auto-detects the format from the file's content. */
export function importBioimpedanceFile(studentId: string, file: File): Promise<BioImportResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("student_id", studentId);
  // Also sent as a query param (Rails merges query/body params either way):
  // Pact's multipart matcher can only assert on the file part of the body,
  // so student_id needs to be somewhere else matchable for the contract
  // test to cover this endpoint — see src/lib/api/bioimpedance-import.pact.test.ts.
  return http.post<BioImportResult>("/api/v1/bioimpedance/import", form, {
    params: { student_id: studentId },
  });
}
