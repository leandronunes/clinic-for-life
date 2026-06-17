import { http } from "./http";

export interface Exam {
  id: string;
  name: string;
  description?: string | null;
  file_url: string;
  content_type: string;
  size: number;
  uploaded_at: string;
}

export interface CreateExamPayload {
  name: string;
  description?: string;
  file_url: string;
  content_type: string;
  size: number;
  uploaded_at: string;
}

export function fetchExams(studentId: string): Promise<Exam[]> {
  return http.get<Exam[]>(`/api/v1/students/${studentId}/exams`);
}

export function createExam(studentId: string, payload: CreateExamPayload): Promise<Exam> {
  return http.post<Exam>(`/api/v1/students/${studentId}/exams`, payload);
}

export function deleteExam(studentId: string, examId: string): Promise<null> {
  return http.del<null>(`/api/v1/students/${studentId}/exams/${examId}`, {
    allowEmpty: true,
  });
}
