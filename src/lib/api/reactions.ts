import { http } from "./http";

export interface WorkoutReaction {
  id: string;
  emoji: string;
  author_name: string | null;
  created_at: string;
}

export function setReaction(
  studentId: string,
  workoutId: string,
  checkInId: string,
  emoji: string,
): Promise<WorkoutReaction> {
  return http.post<WorkoutReaction>(
    `/api/v1/students/${studentId}/workouts/${workoutId}/check_ins/${checkInId}/reaction`,
    { emoji },
  );
}
