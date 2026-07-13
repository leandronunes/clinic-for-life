import { http } from "./http";

export interface CheckInFeedback {
  id: string;
  workout_check_in_id: string;
  emoji: string | null;
  message: string | null;
  author_name: string | null;
  created_at: string;
}

export interface CreateCheckInFeedbackPayload {
  emoji?: string;
  message?: string;
}

export interface UpdateCheckInFeedbackPayload {
  emoji?: string | null;
  message?: string | null;
}

function feedbackUrl(
  studentId: string,
  workoutId: string,
  checkInId: string,
  feedbackId?: string,
): string {
  const base = `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/feedbacks`;
  return feedbackId ? `${base}/${feedbackId}` : base;
}

export function createCheckInFeedback(
  studentId: string,
  workoutId: string,
  checkInId: string,
  payload: CreateCheckInFeedbackPayload,
): Promise<CheckInFeedback> {
  return http.post<CheckInFeedback>(feedbackUrl(studentId, workoutId, checkInId), payload);
}

export function updateCheckInFeedback(
  studentId: string,
  workoutId: string,
  checkInId: string,
  feedbackId: string,
  payload: UpdateCheckInFeedbackPayload,
): Promise<CheckInFeedback> {
  return http.patch<CheckInFeedback>(
    feedbackUrl(studentId, workoutId, checkInId, feedbackId),
    payload,
  );
}

export function deleteCheckInFeedback(
  studentId: string,
  workoutId: string,
  checkInId: string,
  feedbackId: string,
): Promise<void> {
  return http.del<void>(feedbackUrl(studentId, workoutId, checkInId, feedbackId));
}
