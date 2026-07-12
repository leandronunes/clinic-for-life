import { http } from "./http";

export type FeedbackKind = "elogio" | "correcao" | "incentivo";

export interface Feedback {
  id: string;
  kind: FeedbackKind;
  message: string;
  author_name: string | null;
  created_at: string;
}

export interface CreateFeedbackPayload {
  kind: FeedbackKind;
  message: string;
}

export function fetchFeedbacks(studentId: string): Promise<Feedback[]> {
  return http.get<Feedback[]>(`/api/v1/students/${studentId}/feedbacks`);
}

export function createFeedback(
  studentId: string,
  payload: CreateFeedbackPayload,
): Promise<Feedback> {
  return http.post<Feedback>(`/api/v1/students/${studentId}/feedbacks`, payload);
}
