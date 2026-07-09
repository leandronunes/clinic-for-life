import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkoutClipboard, toCreateExercisePayload } from "./use-workout-clipboard";
import type { Workout } from "@/lib/api/workouts";

const workout: Workout = {
  id: "w1",
  position: 1,
  title: "Treino A",
  focus: "Push",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  trainer_name: "Rafael",
  exercises: [
    {
      id: "e1",
      position: 1,
      kind: "strength",
      name: "Supino",
      sets: 4,
      reps: "8-10",
      load_kg: 40,
      rest_seconds: 90,
      muscle_group: "Peito",
      video_url: "https://x/y",
    },
  ],
};

describe("useWorkoutClipboard", () => {
  beforeEach(() => window.localStorage.clear());

  it("copia um treino e disponibiliza no clipboard", () => {
    const { result } = renderHook(() => useWorkoutClipboard());
    expect(result.current.clipboard).toBeNull();

    act(() => result.current.copyWorkout(workout, "aluno-1", "Julia"));

    expect(result.current.clipboard?.title).toBe("Treino A");
    expect(result.current.clipboard?.sourceStudentId).toBe("aluno-1");
    expect(result.current.clipboard?.exercises).toHaveLength(1);
  });

  it("limpa o clipboard", () => {
    const { result } = renderHook(() => useWorkoutClipboard());
    act(() => result.current.copyWorkout(workout, "aluno-1"));
    act(() => result.current.clear());
    expect(result.current.clipboard).toBeNull();
  });

  it("converte exercício do clipboard em payload de criação sem campos nulos", () => {
    const payload = toCreateExercisePayload({
      position: 1,
      name: "Supino",
      kind: "strength",
      sets: 4,
      reps: "8",
      load_kg: null,
      rest_seconds: 90,
      muscle_group: "Peito",
      duration_seconds: null,
      distance_value: null,
      distance_unit: null,
      hr_zone: null,
      heart_rate_bpm: null,
      video_url: "",
      notes: null,
    });
    expect(payload).toEqual({
      name: "Supino",
      kind: "strength",
      sets: 4,
      reps: "8",
      rest_seconds: 90,
      muscle_group: "Peito",
    });
  });
});
