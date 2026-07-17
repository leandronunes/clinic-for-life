import { describe, expect, it } from "vitest";
import {
  addDays,
  expandPlan,
  groupByDay,
  isoDate,
  overlaps,
  startOfMonth,
  startOfWeek,
} from "./schedule";
import type { ScheduleSession } from "@/lib/api/schedules";

describe("expandPlan", () => {
  it("expands weekday slots between two dates inclusive", () => {
    // 2026-07-06 é segunda-feira
    const out = expandPlan(
      [
        { weekday: 1, time: "07:00", duration_minutes: 60 },
        { weekday: 3, time: "18:30", duration_minutes: 45 },
      ],
      "2026-07-06",
      "2026-07-19",
    );
    // Duas semanas: 2 seg + 2 qua = 4 sessões
    expect(out).toHaveLength(4);
    const first = new Date(out[0].starts_at);
    expect(first.getHours()).toBe(7);
    expect(first.getDay()).toBe(1);
  });

  it("returns [] when starts_on > ends_on", () => {
    expect(expandPlan([{ weekday: 1, time: "07:00", duration_minutes: 60 }], "2026-07-20", "2026-07-01")).toEqual([]);
  });
});

describe("overlaps", () => {
  it("detects overlapping ranges", () => {
    const a = new Date("2026-07-06T07:00:00");
    const b = new Date("2026-07-06T07:30:00");
    expect(overlaps(a, 60, b, 30)).toBe(true);
  });
  it("returns false when ranges touch but do not overlap", () => {
    const a = new Date("2026-07-06T07:00:00");
    const b = new Date("2026-07-06T08:00:00");
    expect(overlaps(a, 60, b, 30)).toBe(false);
  });
});

describe("date helpers", () => {
  it("startOfWeek returns Sunday", () => {
    const wed = new Date(2026, 6, 8); // 2026-07-08 (quarta)
    expect(startOfWeek(wed).getDay()).toBe(0);
  });
  it("startOfMonth returns day 1", () => {
    expect(startOfMonth(new Date(2026, 6, 15)).getDate()).toBe(1);
  });
  it("addDays adds N days", () => {
    expect(isoDate(addDays(new Date(2026, 6, 1), 3))).toBe("2026-07-04");
  });
});

describe("groupByDay", () => {
  it("groups sessions by local YYYY-MM-DD", () => {
    const sessions: ScheduleSession[] = [
      {
        id: "s1",
        student_id: "a",
        student_name: "A",
        trainer_id: "t",
        starts_at: new Date(2026, 6, 6, 7, 0).toISOString(),
        duration_minutes: 60,
        status: "planned",
      },
      {
        id: "s2",
        student_id: "b",
        student_name: "B",
        trainer_id: "t",
        starts_at: new Date(2026, 6, 6, 9, 0).toISOString(),
        duration_minutes: 60,
        status: "planned",
      },
    ];
    const grouped = groupByDay(sessions);
    expect(grouped["2026-07-06"]).toHaveLength(2);
  });
});
