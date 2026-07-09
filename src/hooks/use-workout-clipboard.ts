import { useCallback, useSyncExternalStore } from "react";
import type { Workout, Exercise, CreateExercisePayload } from "@/lib/api/workouts";

const STORAGE_KEY = "cfl:workout-clipboard:v1";
const EVENT_NAME = "cfl:workout-clipboard-change";

export interface ClipboardExercise
  extends Pick<
    Exercise,
    | "name"
    | "kind"
    | "sets"
    | "reps"
    | "load_kg"
    | "rest_seconds"
    | "muscle_group"
    | "duration_seconds"
    | "distance_value"
    | "distance_unit"
    | "hr_zone"
    | "heart_rate_bpm"
    | "video_url"
    | "notes"
  > {
  position: number;
}

export interface WorkoutClipboard {
  /** Id do aluno de origem — usado para evitar oferecer colar no mesmo aluno. */
  sourceStudentId: string;
  /** Nome do aluno de origem — mostrado na UI de colar. */
  sourceStudentLabel?: string;
  title: string;
  focus: string;
  trainerName?: string;
  exercises: ClipboardExercise[];
  copiedAt: string;
}

function readStorage(): WorkoutClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkoutClipboard;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, callback);
  };
}

function getSnapshot(): WorkoutClipboard | null {
  return readStorage();
}

function getServerSnapshot(): WorkoutClipboard | null {
  return null;
}

export function toClipboardExercise(ex: Exercise): ClipboardExercise {
  return {
    position: ex.position,
    name: ex.name,
    kind: ex.kind,
    sets: ex.sets ?? null,
    reps: ex.reps ?? null,
    load_kg: ex.load_kg ?? null,
    rest_seconds: ex.rest_seconds ?? null,
    muscle_group: ex.muscle_group ?? null,
    duration_seconds: ex.duration_seconds ?? null,
    distance_value: ex.distance_value ?? null,
    distance_unit: ex.distance_unit ?? null,
    hr_zone: ex.hr_zone ?? null,
    heart_rate_bpm: ex.heart_rate_bpm ?? null,
    video_url: ex.video_url,
    notes: ex.notes ?? null,
  };
}

export function toCreateExercisePayload(ex: ClipboardExercise): CreateExercisePayload {
  const payload: CreateExercisePayload = { name: ex.name };
  if (ex.kind) payload.kind = ex.kind;
  if (ex.sets != null) payload.sets = ex.sets;
  if (ex.reps != null) payload.reps = ex.reps;
  if (ex.load_kg != null) payload.load_kg = ex.load_kg;
  if (ex.rest_seconds != null) payload.rest_seconds = ex.rest_seconds;
  if (ex.muscle_group != null) payload.muscle_group = ex.muscle_group;
  if (ex.duration_seconds != null) payload.duration_seconds = ex.duration_seconds;
  if (ex.distance_value != null) payload.distance_value = ex.distance_value;
  if (ex.distance_unit != null) payload.distance_unit = ex.distance_unit;
  if (ex.hr_zone != null) payload.hr_zone = ex.hr_zone;
  if (ex.heart_rate_bpm != null) payload.heart_rate_bpm = ex.heart_rate_bpm;
  if (ex.video_url) payload.video_url = ex.video_url;
  if (ex.notes != null) payload.notes = ex.notes;
  return payload;
}

export function workoutToClipboard(
  workout: Workout,
  sourceStudentId: string,
  sourceStudentLabel?: string,
): WorkoutClipboard {
  return {
    sourceStudentId,
    sourceStudentLabel,
    title: workout.title,
    focus: workout.focus,
    trainerName: workout.trainer_name,
    exercises: [...workout.exercises]
      .sort((a, b) => a.position - b.position)
      .map(toClipboardExercise),
    copiedAt: new Date().toISOString(),
  };
}

function writeStorage(value: WorkoutClipboard | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function useWorkoutClipboard() {
  const clipboard = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const copyWorkout = useCallback(
    (workout: Workout, sourceStudentId: string, sourceStudentLabel?: string) => {
      writeStorage(workoutToClipboard(workout, sourceStudentId, sourceStudentLabel));
    },
    [],
  );

  const clear = useCallback(() => writeStorage(null), []);

  return { clipboard, copyWorkout, clear };
}
