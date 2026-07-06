import { http } from "./http";

export type StudentSex = "female" | "male" | "other";
export type StudentStatus = "active" | "inactive";

export interface Student {
  id: string;
  name: string;
  birth_date: string;
  sex: StudentSex;
  email: string;
  phone: string;
  trainer_id: string;
  trainer_name: string;
  status: StudentStatus;
  health_plan?: string | null;
  emergency_contact?: string | null;
  created_at: string;
}

export interface CreateStudentPayload {
  name: string;
  birth_date: string;
  sex: StudentSex;
  email: string;
  phone: string;
  trainer_id?: string;
}

export type UpdateStudentPayload = Partial<Omit<Student, "id" | "created_at" | "trainer_name">>;

/** Maps frontend display sex values (F/M/Outro) to backend enum. */
export function toBackendSex(sex: "F" | "M" | "Outro"): StudentSex {
  if (sex === "F") return "female";
  if (sex === "M") return "male";
  return "other";
}

/** Maps backend sex enum to frontend display value. */
export function fromBackendSex(sex: StudentSex): "F" | "M" | "Outro" {
  if (sex === "female") return "F";
  if (sex === "male") return "M";
  return "Outro";
}

export function fetchStudents(params?: {
  trainerId?: string;
  query?: string;
  status?: StudentStatus;
}): Promise<Student[]> {
  return http.get<Student[]>("/api/v1/students", {
    params: {
      trainer_id: params?.trainerId,
      query: params?.query,
      status: params?.status,
    },
  });
}

export function fetchStudent(id: string): Promise<Student> {
  return http.get<Student>(`/api/v1/students/${id}`);
}

export function createStudent(payload: CreateStudentPayload): Promise<Student> {
  return http.post<Student>("/api/v1/students", payload);
}

export function updateStudent(id: string, payload: UpdateStudentPayload): Promise<Student> {
  return http.patch<Student>(`/api/v1/students/${id}`, payload);
}

/**
 * Permanently deletes the student and triggers server-side cleanup of all
 * associated S3 assets (biomechanical images, evolution photos, exam files).
 */
export function deleteStudent(id: string): Promise<void> {
  return http.del<void>(`/api/v1/students/${id}`);
}
