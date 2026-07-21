import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  addDays,
  endOfMonth,
  formatHM,
  gridBounds,
  groupByDay,
  isoDate,
  layoutDayColumns,
  minutesSinceMidnight,
  startOfMonth,
  startOfWeek,
  WEEKDAY_SHORT_PT,
  type GridBounds,
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
  canceled: "bg-muted text-muted-foreground border-border line-through hover:bg-muted/80",
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

/** Altura de 1h na grade de horário — convenção comum de calendário, dá
 * espaço suficiente pra ler o conteúdo de uma aula de 30min sem espremer. */
const HOUR_HEIGHT_PX = 60;

/** Atualiza a cada minuto, sem precisar de interação do usuário, pra linha
 * do "agora" andar sozinha (igual ao Google Calendar). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function gridHeightPx(bounds: GridBounds): number {
  return ((bounds.endMinutes - bounds.startMinutes) / 60) * HOUR_HEIGHT_PX;
}

function topForMinutes(bounds: GridBounds, minutes: number): number {
  return ((minutes - bounds.startMinutes) / 60) * HOUR_HEIGHT_PX;
}

/** Coluna de rótulos de hora à esquerda da grade — mostra só as horas
 * cheias dentro da faixa visível (`bounds` pode começar/terminar em minutos
 * quebrados por causa da margem de expansão, mas os rótulos ficam sempre
 * em horas cheias). */
function TimeAxis({ bounds }: { bounds: GridBounds }) {
  const firstHour = Math.ceil(bounds.startMinutes / 60);
  const lastHour = Math.floor(bounds.endMinutes / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  return (
    <div className="relative w-11 shrink-0 sm:w-14" style={{ height: gridHeightPx(bounds) }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
          style={{ top: topForMinutes(bounds, h * 60) }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

/** Linhas horizontais da grade — hora cheia mais forte, meia hora mais sutil. */
function GridLines({ bounds }: { bounds: GridBounds }) {
  const firstHalfHour = Math.ceil(bounds.startMinutes / 30);
  const lastHalfHour = Math.floor(bounds.endMinutes / 30);
  const marks = Array.from(
    { length: lastHalfHour - firstHalfHour + 1 },
    (_, i) => (firstHalfHour + i) * 30,
  );

  return (
    <>
      {marks.map((minutes) => (
        <div
          key={minutes}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t",
            minutes % 60 === 0 ? "border-border" : "border-border/50",
          )}
          style={{ top: topForMinutes(bounds, minutes) }}
        />
      ))}
    </>
  );
}

/** Linha vermelha marcando o horário atual — só renderiza quando "agora"
 * cai dentro da faixa visível da grade daquele dia. */
function NowLine({ bounds, now }: { bounds: GridBounds; now: Date }) {
  const minutes = minutesSinceMidnight(now);
  if (minutes < bounds.startMinutes || minutes > bounds.endMinutes) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive"
      style={{ top: topForMinutes(bounds, minutes) }}
    >
      <span className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-destructive" />
    </div>
  );
}

function SessionBlock({
  session,
  bounds,
  column,
  columnCount,
  showStudentName,
  onSelect,
}: {
  session: ScheduleSession;
  bounds: GridBounds;
  column: number;
  columnCount: number;
  showStudentName?: boolean;
  onSelect?: (s: ScheduleSession) => void;
}) {
  const start = new Date(session.starts_at);
  const top = topForMinutes(bounds, minutesSinceMidnight(start));
  const height = Math.max((session.duration_minutes / 60) * HOUR_HEIGHT_PX, 18);
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * column;
  // Um bloco baixo (aula curta) não tem espaço pra linha de duração/status
  // sem cortar o texto — mostra só horário (+ nome, se aplicável).
  const showDetails = height >= 40;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(session)}
      className={cn(
        "absolute overflow-hidden rounded border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm",
        STATUS_STYLES[session.status],
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      title={`${formatHM(start)} · ${session.student_name} · ${session.duration_minutes} min`}
    >
      <div className="font-semibold tabular-nums">{formatHM(start)}</div>
      {showStudentName && <div className="truncate">{session.student_name}</div>}
      {showDetails && (
        <div className="truncate text-muted-foreground">
          {session.duration_minutes} min · {statusLabel(session.status)}
        </div>
      )}
    </button>
  );
}

/** Corpo da grade de um único dia: linhas de horário + linha do "agora" +
 * os blocos de aula daquele dia, posicionados por horário/duração e
 * divididos em colunas quando há sobreposição (`layoutDayColumns`). */
function DayColumn({
  sessions,
  bounds,
  now,
  isToday,
  showStudentName,
  onSelectSession,
  className,
}: {
  sessions: ScheduleSession[];
  bounds: GridBounds;
  now: Date;
  isToday: boolean;
  showStudentName?: boolean;
  onSelectSession?: (s: ScheduleSession) => void;
  className?: string;
}) {
  const layout = useMemo(() => layoutDayColumns(sessions), [sessions]);

  return (
    <div className={cn("relative", className)} style={{ height: gridHeightPx(bounds) }}>
      <GridLines bounds={bounds} />
      {isToday && <NowLine bounds={bounds} now={now} />}
      {layout.map(({ session, column, columnCount }) => (
        <SessionBlock
          key={session.id}
          session={session}
          bounds={bounds}
          column={column}
          columnCount={columnCount}
          showStudentName={showStudentName}
          onSelect={onSelectSession}
        />
      ))}
    </div>
  );
}

function DayView({ cursor, sessions, showStudentName, onSelectSession }: AgendaCalendarProps) {
  const dayKey = isoDate(cursor);
  const now = useNow();
  const daySessions = useMemo(
    () => sessions.filter((s) => isoDate(new Date(s.starts_at)) === dayKey),
    [sessions, dayKey],
  );
  const bounds = useMemo(() => gridBounds(daySessions), [daySessions]);

  if (daySessions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
        Nenhum treino planejado para este dia.
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto rounded-md border">
      <TimeAxis bounds={bounds} />
      <DayColumn
        sessions={daySessions}
        bounds={bounds}
        now={now}
        isToday={dayKey === isoDate(now)}
        showStudentName={showStudentName}
        onSelectSession={onSelectSession}
        className="flex-1 border-l"
      />
    </div>
  );
}

function WeekView({ cursor, sessions, showStudentName, onSelectSession }: AgendaCalendarProps) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const grouped = useMemo(() => groupByDay(sessions), [sessions]);
  const now = useNow();
  const today = isoDate(now);
  const bounds = useMemo(() => gridBounds(sessions), [sessions]);

  return (
    <div className="overflow-x-auto rounded-md border">
      <div className="flex min-w-[640px]">
        <div className="flex flex-col">
          <div className="h-10 shrink-0" />
          <TimeAxis bounds={bounds} />
        </div>
        {days.map((d) => {
          const key = isoDate(d);
          const items = grouped[key] ?? [];
          const isToday = key === today;
          return (
            <div key={key} className="flex flex-1 flex-col border-l">
              <div
                className={cn(
                  "flex h-10 shrink-0 flex-col items-center justify-center border-b",
                  isToday && "bg-primary/5",
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground">
                  {WEEKDAY_SHORT_PT[d.getDay()]}
                </span>
                <span className={cn("text-xs font-semibold", isToday && "text-primary")}>
                  {d.getDate()}
                </span>
              </div>
              <DayColumn
                sessions={items}
                bounds={bounds}
                now={now}
                isToday={isToday}
                showStudentName={showStudentName}
                onSelectSession={onSelectSession}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ cursor, sessions, showStudentName, onSelectDay }: AgendaCalendarProps) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const totalCells =
    Math.ceil((Math.floor((last.getTime() - gridStart.getTime()) / 86_400_000) + 1) / 7) * 7;
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
