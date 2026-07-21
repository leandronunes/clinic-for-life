import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgendaCalendar } from "./AgendaCalendar";
import type { ScheduleSession } from "@/lib/api/schedules";

function buildSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "s1",
    student_id: "a1",
    student_name: "Júlia Ferreira",
    trainer_id: "t1",
    starts_at: new Date(2026, 6, 8, 7, 0).toISOString(), // 2026-07-08, quarta
    duration_minutes: 60,
    status: "planned",
    ...overrides,
  };
}

const CURSOR = new Date(2026, 6, 8); // 2026-07-08 (quarta)

describe("AgendaCalendar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("day view", () => {
    it("shows the empty state when there are no sessions that day", () => {
      render(<AgendaCalendar view="day" cursor={CURSOR} sessions={[]} />);
      expect(screen.getByText("Nenhum treino planejado para este dia.")).toBeInTheDocument();
    });

    it("positions a session's top/height proportionally to its start time and duration", () => {
      const session = buildSession({
        starts_at: new Date(2026, 6, 8, 8, 0).toISOString(),
        duration_minutes: 60,
      });
      render(<AgendaCalendar view="day" cursor={CURSOR} sessions={[session]} showStudentName />);

      const block = screen.getByRole("button", { name: /Júlia Ferreira/ });
      // Default grid starts at 06:00 — 08:00 is 2h in, at 60px/h = 120px.
      expect(block.style.top).toBe("120px");
      // 60min duration at 60px/h = 60px.
      expect(block.style.height).toBe("60px");
    });

    it("gives a session a shorter block for a shorter duration", () => {
      const session = buildSession({ duration_minutes: 30 });
      render(<AgendaCalendar view="day" cursor={CURSOR} sessions={[session]} showStudentName />);

      const block = screen.getByRole("button", { name: /Júlia Ferreira/ });
      expect(block.style.height).toBe("30px");
    });

    it("expands the grid to include a session outside the default 06:00–21:00 range", () => {
      const session = buildSession({ starts_at: new Date(2026, 6, 8, 22, 0).toISOString() });
      render(<AgendaCalendar view="day" cursor={CURSOR} sessions={[session]} />);

      expect(screen.getByText("23:00")).toBeInTheDocument();
    });

    it("splits two overlapping sessions into side-by-side columns", () => {
      const a = buildSession({
        id: "a",
        starts_at: new Date(2026, 6, 8, 7, 0).toISOString(),
        duration_minutes: 60,
      });
      const b = buildSession({
        id: "b",
        student_name: "Pedro Almeida",
        starts_at: new Date(2026, 6, 8, 7, 30).toISOString(),
        duration_minutes: 30,
      });
      render(<AgendaCalendar view="day" cursor={CURSOR} sessions={[a, b]} showStudentName />);

      const blockA = screen.getByRole("button", { name: /Júlia Ferreira/ });
      const blockB = screen.getByRole("button", { name: /Pedro Almeida/ });
      expect(blockA.style.width).toBe("calc(50% - 4px)");
      expect(blockB.style.width).toBe("calc(50% - 4px)");
      expect(blockA.style.left).not.toBe(blockB.style.left);
    });

    it("calls onSelectSession when a session block is clicked", async () => {
      const session = buildSession();
      const onSelectSession = vi.fn();
      const user = userEvent.setup();
      render(
        <AgendaCalendar
          view="day"
          cursor={CURSOR}
          sessions={[session]}
          showStudentName
          onSelectSession={onSelectSession}
        />,
      );

      await user.click(screen.getByRole("button", { name: /Júlia Ferreira/ }));
      expect(onSelectSession).toHaveBeenCalledWith(session);
    });

    it("hides the duration/status line on a short session block, but keeps it on a longer one", () => {
      const short = buildSession({ duration_minutes: 15 });
      const { rerender } = render(
        <AgendaCalendar view="day" cursor={CURSOR} sessions={[short]} showStudentName />,
      );
      expect(screen.queryByText(/Planejado/)).not.toBeInTheDocument();

      const long = buildSession({ duration_minutes: 60 });
      rerender(<AgendaCalendar view="day" cursor={CURSOR} sessions={[long]} showStudentName />);
      expect(screen.getByText(/Planejado/)).toBeInTheDocument();
    });

    it("shows the now line only when the visible day is today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 8, 10, 0));
      const session = buildSession();
      const { container: todayContainer } = render(
        <AgendaCalendar view="day" cursor={CURSOR} sessions={[session]} />,
      );
      expect(todayContainer.querySelector(".border-destructive")).toBeInTheDocument();

      const { container: otherDayContainer } = render(
        <AgendaCalendar
          view="day"
          cursor={new Date(2026, 6, 9)}
          sessions={[buildSession({ starts_at: new Date(2026, 6, 9, 7, 0).toISOString() })]}
        />,
      );
      expect(otherDayContainer.querySelector(".border-destructive")).not.toBeInTheDocument();
    });
  });

  describe("week view", () => {
    it("renders all 7 weekday headers", () => {
      render(<AgendaCalendar view="week" cursor={CURSOR} sessions={[]} />);
      for (const label of ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it("places a session under the correct day column", () => {
      // 2026-07-09 é quinta
      const session = buildSession({
        starts_at: new Date(2026, 6, 9, 9, 0).toISOString(),
        student_name: "Pedro Almeida",
      });
      render(<AgendaCalendar view="week" cursor={CURSOR} sessions={[session]} showStudentName />);

      const block = screen.getByRole("button", { name: /Pedro Almeida/ });
      // Grid starts 06:00 — 09:00 is 3h in, at 60px/h = 180px, independent of column.
      expect(block.style.top).toBe("180px");
    });

    it("shows an empty day column without crashing when a day has no sessions", () => {
      render(<AgendaCalendar view="week" cursor={CURSOR} sessions={[]} />);
      expect(screen.queryByRole("button", { name: /Júlia Ferreira/ })).not.toBeInTheDocument();
    });
  });

  describe("month view (unchanged dot-based rendering)", () => {
    it("shows a status dot for each session on its day, up to 4", () => {
      const sessions = Array.from({ length: 5 }, (_, i) =>
        buildSession({ id: `s${i}`, starts_at: new Date(2026, 6, 8, 7 + i, 0).toISOString() }),
      );
      render(<AgendaCalendar view="month" cursor={CURSOR} sessions={sessions} />);
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("calls onSelectDay when a day cell is clicked", async () => {
      const onSelectDay = vi.fn();
      const user = userEvent.setup();
      render(
        <AgendaCalendar view="month" cursor={CURSOR} sessions={[]} onSelectDay={onSelectDay} />,
      );
      const cell = within(screen.getByText("8").closest("button")!);
      await user.click(cell.getByText("8"));
      expect(onSelectDay).toHaveBeenCalled();
    });
  });
});
