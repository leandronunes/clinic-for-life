import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useWorkoutClipboard,
  toCreateExercisePayload,
  toClipboardExercise,
  workoutToClipboard,
} from "./use-workout-clipboard";
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

// Mesmo treino, mas com os exercícios fora de ordem no array — o clipboard
// deve reordenar por `position`, não confiar na ordem de inserção.
const workoutOutOfOrder: Workout = {
  ...workout,
  exercises: [
    {
      id: "e2",
      position: 2,
      kind: "strength",
      name: "Crucifixo",
      sets: 3,
      reps: "12",
      rest_seconds: 60,
      muscle_group: "Peito",
      video_url: "",
    },
    { ...workout.exercises[0] },
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

  it("converte um exercício em ClipboardExercise preservando a posição", () => {
    const clip = toClipboardExercise(workout.exercises[0]);

    expect(clip).toEqual({
      position: 1,
      name: "Supino",
      kind: "strength",
      sets: 4,
      reps: "8-10",
      load_kg: 40,
      rest_seconds: 90,
      muscle_group: "Peito",
      duration_seconds: null,
      distance_value: null,
      distance_unit: null,
      hr_zone: null,
      heart_rate_bpm: null,
      video_url: "https://x/y",
      notes: null,
    });
  });

  it("monta o clipboard com os exercícios ordenados por position, não pela ordem do array", () => {
    const clip = workoutToClipboard(workoutOutOfOrder, "aluno-1", "Julia");

    expect(clip.exercises.map((e) => e.name)).toEqual(["Supino", "Crucifixo"]);
    expect(clip.sourceStudentId).toBe("aluno-1");
    expect(clip.sourceStudentLabel).toBe("Julia");
    expect(clip.trainerName).toBe("Rafael");
    expect(clip.title).toBe("Treino A");
    expect(clip.focus).toBe("Push");
  });

  it("sincroniza entre instâncias do hook quando o localStorage muda em outra aba", () => {
    const { result: writer } = renderHook(() => useWorkoutClipboard());
    const { result: reader } = renderHook(() => useWorkoutClipboard());

    act(() => writer.current.copyWorkout(workout, "aluno-1"));
    // A própria aba já reage via CustomEvent — o caminho ainda não coberto é o
    // listener de "storage", que é como outra aba percebe a mudança: o valor
    // já está em localStorage (mesmo processo), só falta disparar o evento
    // que o browser dispara nativamente para as demais abas.
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "cfl:workout-clipboard:v1" }));
    });

    expect(reader.current.clipboard?.title).toBe("Treino A");
  });

  it("retorna null quando o conteúdo salvo está corrompido", () => {
    window.localStorage.setItem("cfl:workout-clipboard:v1", "{not-json");
    const { result } = renderHook(() => useWorkoutClipboard());

    expect(result.current.clipboard).toBeNull();
  });
});
