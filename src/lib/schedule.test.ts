import { describe, expect, it } from "vitest";
import {
  addDays,
  expandPlan,
  gridBounds,
  groupByDay,
  isoDate,
  layoutDayColumns,
  minutesSinceMidnight,
  overlaps,
  startOfMonth,
  startOfWeek,
} from "./schedule";
import type { ScheduleSession } from "@/lib/api/schedules";

function buildSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "s1",
    student_id: "a",
    student_name: "A",
    trainer_id: "t",
    starts_at: new Date(2026, 6, 6, 7, 0).toISOString(),
    duration_minutes: 60,
    status: "planned",
    ...overrides,
  };
}

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
    expect(
      expandPlan([{ weekday: 1, time: "07:00", duration_minutes: 60 }], "2026-07-20", "2026-07-01"),
    ).toEqual([]);
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

describe("minutesSinceMidnight", () => {
  it("converts local hours/minutes to minutes since 00:00", () => {
    expect(minutesSinceMidnight(new Date(2026, 6, 6, 7, 30))).toBe(450);
    expect(minutesSinceMidnight(new Date(2026, 6, 6, 0, 0))).toBe(0);
  });
});

describe("gridBounds", () => {
  it("uses the default range when every session fits inside it", () => {
    const sessions = [
      buildSession({ starts_at: new Date(2026, 6, 6, 7, 0).toISOString() }),
      buildSession({ starts_at: new Date(2026, 6, 6, 18, 0).toISOString() }),
    ];
    expect(gridBounds(sessions)).toEqual({ startMinutes: 6 * 60, endMinutes: 21 * 60 });
  });

  it("expands the start earlier (with 1h margin) for a session before the default start", () => {
    const sessions = [buildSession({ starts_at: new Date(2026, 6, 6, 5, 0).toISOString() })];
    expect(gridBounds(sessions).startMinutes).toBe(4 * 60);
  });

  it("expands the end later (with 1h margin) for a session after the default end", () => {
    const sessions = [
      buildSession({
        starts_at: new Date(2026, 6, 6, 21, 30).toISOString(),
        duration_minutes: 60,
      }),
    ];
    // ends at 22:30, +1h margin = 23:30
    expect(gridBounds(sessions).endMinutes).toBe(23 * 60 + 30);
  });

  it("never expands past midnight on either side", () => {
    const earlySession = [buildSession({ starts_at: new Date(2026, 6, 6, 0, 30).toISOString() })];
    expect(gridBounds(earlySession).startMinutes).toBe(0);

    const lateSession = [
      buildSession({
        starts_at: new Date(2026, 6, 6, 23, 0).toISOString(),
        duration_minutes: 90,
      }),
    ];
    expect(gridBounds(lateSession).endMinutes).toBe(24 * 60);
  });

  it("returns the default range for an empty session list", () => {
    expect(gridBounds([])).toEqual({ startMinutes: 6 * 60, endMinutes: 21 * 60 });
  });
});

describe("layoutDayColumns", () => {
  it("gives every session its own full-width column when nothing overlaps", () => {
    const sessions = [
      buildSession({ id: "a", starts_at: new Date(2026, 6, 6, 7, 0).toISOString() }),
      buildSession({ id: "b", starts_at: new Date(2026, 6, 6, 9, 0).toISOString() }),
    ];
    const layout = layoutDayColumns(sessions);
    expect(layout).toEqual([
      { session: sessions[0], column: 0, columnCount: 1 },
      { session: sessions[1], column: 0, columnCount: 1 },
    ]);
  });

  it("splits two overlapping sessions into side-by-side columns", () => {
    const sessions = [
      buildSession({ id: "a", starts_at: new Date(2026, 6, 6, 7, 0).toISOString() }),
      buildSession({
        id: "b",
        starts_at: new Date(2026, 6, 6, 7, 30).toISOString(),
        duration_minutes: 30,
      }),
    ];
    const layout = layoutDayColumns(sessions);
    expect(layout.map((l) => l.column)).toEqual([0, 1]);
    expect(layout.every((l) => l.columnCount === 2)).toBe(true);
  });

  it("gives three mutually-overlapping sessions three columns", () => {
    const sessions = [
      buildSession({
        id: "a",
        starts_at: new Date(2026, 6, 6, 7, 0).toISOString(),
        duration_minutes: 90,
      }),
      buildSession({
        id: "b",
        starts_at: new Date(2026, 6, 6, 7, 15).toISOString(),
        duration_minutes: 30,
      }),
      buildSession({
        id: "c",
        starts_at: new Date(2026, 6, 6, 7, 30).toISOString(),
        duration_minutes: 30,
      }),
    ];
    const layout = layoutDayColumns(sessions);
    expect(layout.map((l) => l.column)).toEqual([0, 1, 2]);
    expect(layout.every((l) => l.columnCount === 3)).toBe(true);
  });

  it("keeps two independent overlap groups on the same day from mixing columnCounts", () => {
    const sessions = [
      buildSession({ id: "a", starts_at: new Date(2026, 6, 6, 7, 0).toISOString() }),
      buildSession({
        id: "b",
        starts_at: new Date(2026, 6, 6, 7, 15).toISOString(),
        duration_minutes: 30,
      }),
      buildSession({
        id: "c",
        starts_at: new Date(2026, 6, 6, 18, 0).toISOString(),
        duration_minutes: 30,
      }),
    ];
    const layout = layoutDayColumns(sessions);
    const byId = Object.fromEntries(layout.map((l) => [l.session.id, l]));
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
    expect(byId.c.columnCount).toBe(1);
    expect(byId.c.column).toBe(0);
  });

  it("reuses a freed-up column for a later session that no longer overlaps", () => {
    // a: 07:00-07:40, b: 07:30-08:10, c: 08:00-08:40 — a/b overlap, b/c
    // overlap, but a/c don't. All three still share one cluster (chained
    // overlap), with max concurrency 2, so c can reuse column 0 once a ends.
    const sessions = [
      buildSession({
        id: "a",
        starts_at: new Date(2026, 6, 6, 7, 0).toISOString(),
        duration_minutes: 40,
      }),
      buildSession({
        id: "b",
        starts_at: new Date(2026, 6, 6, 7, 30).toISOString(),
        duration_minutes: 40,
      }),
      buildSession({
        id: "c",
        starts_at: new Date(2026, 6, 6, 8, 0).toISOString(),
        duration_minutes: 40,
      }),
    ];
    const layout = layoutDayColumns(sessions);
    const byId = Object.fromEntries(layout.map((l) => [l.session.id, l]));
    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(0);
    expect(layout.every((l) => l.columnCount === 2)).toBe(true);
  });

  it("returns [] for an empty session list", () => {
    expect(layoutDayColumns([])).toEqual([]);
  });
});
