import { describe, it, expect } from "vitest";
import { computeAttendanceCycle } from "./attendance-cycle";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";

function checkIn(id: string, completedAt: string | null, status: "completed" | "in_progress" = "completed"): WorkoutCheckIn {
  return {
    id,
    workout_id: "w",
    workout_title: "W",
    student_id: "s",
    student_name: "S",
    status,
    exercises_completed: 1,
    exercises_total: 1,
    completed_exercise_ids: [],
    started_at: completedAt ?? "2026-01-01T00:00:00.000Z",
    completed_at: completedAt,
    viewed_at: null,
    feedbacks: [],
  };
}

describe("computeAttendanceCycle", () => {
  it("returns no_contract when contracted is null", () => {
    const result = computeAttendanceCycle(
      [checkIn("a", "2026-01-10T10:00:00.000Z")],
      null,
      null,
    );
    expect(result.status).toBe("no_contract");
    expect(result.completedInCycle).toBe(1);
    expect(result.contracted).toBeNull();
    expect(result.percentage).toBe(0);
  });

  it("counts only completed check-ins within the cycle start", () => {
    const result = computeAttendanceCycle(
      [
        checkIn("a", "2026-01-10T10:00:00.000Z"),
        checkIn("b", "2025-12-20T10:00:00.000Z"),
        checkIn("c", "2026-01-15T10:00:00.000Z", "in_progress"),
      ],
      10,
      "2026-01-01T00:00:00.000Z",
    );
    expect(result.completedInCycle).toBe(1);
    expect(result.lastCompletedAt).toBe("2026-01-10T10:00:00.000Z");
    expect(result.status).toBe("on_track");
  });

  it("marks near_limit at >= 80%", () => {
    const list = Array.from({ length: 8 }, (_, i) =>
      checkIn(`c${i}`, `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`),
    );
    const result = computeAttendanceCycle(list, 10, "2026-01-01T00:00:00.000Z");
    expect(result.completedInCycle).toBe(8);
    expect(result.percentage).toBe(80);
    expect(result.status).toBe("near_limit");
  });

  it("marks exceeded when over quota", () => {
    const list = Array.from({ length: 12 }, (_, i) =>
      checkIn(`c${i}`, `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`),
    );
    const result = computeAttendanceCycle(list, 10, "2026-01-01T00:00:00.000Z");
    expect(result.status).toBe("exceeded");
    expect(result.percentage).toBe(120);
  });

  it("handles missing cycleStartedAt (counts everything)", () => {
    const result = computeAttendanceCycle(
      [
        checkIn("a", "2020-01-10T10:00:00.000Z"),
        checkIn("b", "2026-01-10T10:00:00.000Z"),
      ],
      10,
      null,
    );
    expect(result.completedInCycle).toBe(2);
  });
});
