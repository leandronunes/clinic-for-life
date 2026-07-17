import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  addDays,
  endOfMonth,
  formatHM,
  groupByDay,
  isoDate,
  startOfMonth,
  startOfWeek,
  WEEKDAY_SHORT_PT,
} from "@/lib/schedule";
import type { ScheduleSession } from "@/lib/api/schedules";

export type AgendaView = "day" | "week" | "month";

export interface AgendaCalendarProps {
  view: AgendaView;
  cursor: Date;
  sessions: ScheduleSession[];
  /** Quando true, exibe o nome do aluno em cada bloco (visão do personal). */
  showStudentName?: boolean;
  onSelectSession?: (s: ScheduleSession) => void;
  onSelectDay?: (d: Date) => void;
}

const STATUS_STYLES: Record<ScheduleSession["status"], string> = {
  planned: "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
  missed: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25",
  canceled:
    "bg-muted text-muted-foreground border-border line-through hover:bg-muted/80",
};

const STATUS_DOT: Record<ScheduleSession["status"], string> = {
  planned: "bg-primary",
  done: "bg-emerald-500",
  missed: "bg-destructive",
  canceled: "bg-muted-foreground/60",
};

export function AgendaCalendar(props: AgendaCalendarProps) {
  if (props.view === "day") return <DayView {...props} />;
  if (props.view === "week") return <WeekView {...props} />;
  return <MonthView {...props} />;
}

function DayView({ cursor, sessions, showStudentName, onSelectSession }: AgendaCalendarProps) {
  const dayKey = isoDate(cursor);
  const list = useMemo(
    () =>
      sessions
        .filter((s) => isoDate(new Date(s.starts_at)) === dayKey)
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    [sessions, dayKey],
  );

  if (list.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        Nenhum treino planejado para este dia.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {list.map((s) => {
        const d = new Date(s.starts_at);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelectSession?.(s)}
              className="flex w-full items-center gap-4 p-3 text-left hover:bg-muted/60"
            >
              <div className="min-w-16 text-sm font-semibold tabular-nums">{formatHM(d)}</div>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[s.status])} />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">
                  {showStudentName ? s.student_name : "Treino programado"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.duration_minutes} min · {statusLabel(s.status)}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function WeekView({ cursor, sessions, showStudentName, onSelectSession }: AgendaCalendarProps) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const grouped = useMemo(() => groupByDay(sessions), [sessions]);
  const today = isoDate(new Date());

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const key = isoDate(d);
        const items = grouped[key] ?? [];
        const isToday = key === today;
        return (
          <div
            key={key}
            className={cn(
              "flex min-h-40 flex-col rounded-md border bg-card p-1.5",
              isToday && "border-primary/60 ring-1 ring-primary/20",
            )}
          >
            <div className="mb-1 flex items-baseline justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {WEEKDAY_SHORT_PT[d.getDay()]}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isToday && "text-primary",
                )}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {items.map((s) => {
                const t = new Date(s.starts_at);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSession?.(s)}
                    className={cn(
                      "rounded border px-1.5 py-1 text-left text-[11px] leading-tight",
                      STATUS_STYLES[s.status],
                    )}
                    title={`${formatHM(t)} · ${s.student_name}`}
                  >
                    <div className="font-semibold tabular-nums">{formatHM(t)}</div>
                    {showStudentName && (
                      <div className="truncate">{s.student_name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ cursor, sessions, showStudentName, onSelectDay }: AgendaCalendarProps) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const totalCells = Math.ceil(
    (Math.floor((last.getTime() - gridStart.getTime()) / 86_400_000) + 1) / 7,
  ) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));
  const grouped = useMemo(() => groupByDay(sessions), [sessions]);
  const today = isoDate(new Date());
  const monthIdx = cursor.getMonth();

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 px-1 text-center text-xs font-medium text-muted-foreground">
        {[0, 1, 2, 3, 4, 5, 6].map((w) => (
          <div key={w}>{WEEKDAY_SHORT_PT[w]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = isoDate(d);
          const items = grouped[key] ?? [];
          const isThisMonth = d.getMonth() === monthIdx;
          const isToday = key === today;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDay?.(d)}
              className={cn(
                "flex min-h-20 flex-col rounded-md border p-1 text-left transition hover:bg-muted/60",
                !isThisMonth && "opacity-40",
                isToday && "border-primary/60 ring-1 ring-primary/20",
              )}
            >
              <div className={cn("mb-1 text-xs font-semibold", isToday && "text-primary")}>
                {d.getDate()}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {items.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s.status])}
                    aria-hidden
                  />
                ))}
                {items.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{items.length - 4}</span>
                )}
              </div>
              {showStudentName && items.length > 0 && (
                <div className="mt-auto truncate text-[10px] text-muted-foreground">
                  {items.length} {items.length === 1 ? "aula" : "aulas"}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function statusLabel(status: ScheduleSession["status"]): string {
  switch (status) {
    case "planned":
      return "Planejado";
    case "done":
      return "Concluído";
    case "missed":
      return "Não realizado";
    case "canceled":
      return "Cancelado";
  }
}
