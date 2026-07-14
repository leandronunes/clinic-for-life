import { describe, it, expect } from "vitest";
import type { Exercise } from "@/lib/api/workouts";
import {
  getKind,
  secondsToMMSS,
  mmssToSeconds,
  formatDuration,
  describeExercise,
} from "@/lib/exercise-kind";

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "e1",
    position: 1,
    name: "Supino reto",
    sets: 3,
    reps: "10",
    rest_seconds: 60,
    muscle_group: "Peito",
    video_url: "",
    ...overrides,
  };
}

describe("getKind", () => {
  it("defaults to strength when kind is not set", () => {
    expect(getKind(makeExercise())).toBe("strength");
  });

  it("returns the exercise's own kind when set", () => {
    expect(getKind(makeExercise({ kind: "cardio" }))).toBe("cardio");
  });
});

describe("secondsToMMSS", () => {
  it("formats seconds as mm:ss", () => {
    expect(secondsToMMSS(125)).toBe("02:05");
  });

  it("returns an empty string for zero or negative values", () => {
    expect(secondsToMMSS(0)).toBe("");
    expect(secondsToMMSS(-5)).toBe("");
  });
});

describe("mmssToSeconds", () => {
  it("parses digits right-aligned into minutes and seconds", () => {
    expect(mmssToSeconds("20:00")).toBe(1200);
    expect(mmssToSeconds("0500")).toBe(300);
  });

  it("returns 0 when there are no digits", () => {
    expect(mmssToSeconds("")).toBe(0);
    expect(mmssToSeconds(":")).toBe(0);
  });
});

describe("formatDuration", () => {
  it("prefers mm:ss formatting when possible", () => {
    expect(formatDuration(90)).toBe("01:30");
  });

  it("falls back to raw seconds when the total is not positive", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("describeExercise", () => {
  it("describes a strength exercise with sets, reps and rest", () => {
    expect(describeExercise(makeExercise())).toBe("3 séries × 10 reps · Descanso 60s");
  });

  it("describes a mobility exercise", () => {
    expect(describeExercise(makeExercise({ kind: "mobility", sets: 2, reps: "30s" }))).toBe(
      "Mobilidade · 2 séries × 30s",
    );
  });

  it("describes a cardio exercise with the available fields", () => {
    expect(
      describeExercise(
        makeExercise({
          kind: "cardio",
          duration_seconds: 600,
          distance_value: 5,
          distance_unit: "km",
          hr_zone: 3,
          heart_rate_bpm: "140",
        }),
      ),
    ).toBe("Cardio · 10:00 · 5 km · Zona 3 · 140 bpm");
  });
});
