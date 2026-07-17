import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CycleHistoryRow } from "./CycleHistoryRow";
import type { AttendanceCycleRecord } from "@/lib/api/attendance-cycles";

function buildCycleRecord(overrides: Partial<AttendanceCycleRecord> = {}): AttendanceCycleRecord {
  return {
    id: "cycle1",
    student_id: "s1",
    contracted_workouts_per_cycle: 8,
    completed_workouts: 6,
    percentage: 75,
    status: "completed",
    started_at: "2026-05-01T12:00:00Z",
    ended_at: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

function renderRow(cycle: AttendanceCycleRecord) {
  return render(
    <ul>
      <CycleHistoryRow cycle={cycle} />
    </ul>,
  );
}

describe("CycleHistoryRow", () => {
  it("shows the cycle window, completion count, and percentage", () => {
    renderRow(buildCycleRecord());

    expect(screen.getByText("6 / 8 treinos (75%)")).toBeInTheDocument();
    expect(screen.getByText(/01\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/01\/06\/2026/)).toBeInTheDocument();
  });

  it("shows a success badge when the cycle was fulfilled", () => {
    renderRow(buildCycleRecord({ status: "completed" }));

    expect(screen.getByText("Cumpriu")).toBeInTheDocument();
  });

  it("shows a destructive badge when the cycle was exceeded", () => {
    renderRow(buildCycleRecord({ status: "exceeded" }));

    expect(screen.getByText("Estourou")).toBeInTheDocument();
  });
});
