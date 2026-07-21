import type { ScheduleSession, WeekdaySlot } from "@/lib/api/schedules";

/**
 * Expande um plano semanal recorrente em ocorrências concretas entre duas datas
 * (inclusive). Retorna ISO strings preservando o horário local dado em `time`.
 */
export function expandPlan(
  weekdays: WeekdaySlot[],
  startsOn: string,
  endsOn: string,
): Array<{ starts_at: string; duration_minutes: number; weekday: number }> {
  const start = parseDateOnly(startsOn);
  const end = parseDateOnly(endsOn);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const out: Array<{ starts_at: string; duration_minutes: number; weekday: number }> = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    for (const slot of weekdays) {
      if (cursor.getDay() === slot.weekday) {
        const [hh, mm] = slot.time.split(":").map(Number);
        const d = new Date(cursor);
        d.setHours(hh || 0, mm || 0, 0, 0);
        out.push({
          starts_at: d.toISOString(),
          duration_minutes: slot.duration_minutes,
          weekday: slot.weekday,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Retorna o início do dia local (00:00). */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Domingo como início da semana (padrão pt-BR de calendário). */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** true quando dois eventos [start,end) se sobrepõem. */
export function overlaps(
  aStart: Date,
  aDurationMin: number,
  bStart: Date,
  bDurationMin: number,
): boolean {
  const aEnd = new Date(aStart.getTime() + aDurationMin * 60_000);
  const bEnd = new Date(bStart.getTime() + bDurationMin * 60_000);
  return aStart < bEnd && bStart < aEnd;
}

/** Minutos desde 00:00 local — base pra calcular top/height na grade de horário. */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export interface GridBounds {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Faixa de horário (em minutos desde 00:00) que a grade de dia/semana deve
 * cobrir. Usa o horário comercial típico como default, mas expande (com 1h
 * de margem) pra nunca cortar uma aula real fora dele — não há convenção de
 * horário comercial fixa no cadastro (`PlanejarAulasDialog` aceita qualquer
 * horário).
 */
export function gridBounds(
  sessions: ScheduleSession[],
  defaultStartHour = 6,
  defaultEndHour = 21,
): GridBounds {
  let startMinutes = defaultStartHour * 60;
  let endMinutes = defaultEndHour * 60;
  for (const s of sessions) {
    const start = minutesSinceMidnight(new Date(s.starts_at));
    const end = start + s.duration_minutes;
    if (start < startMinutes) startMinutes = Math.max(0, start - 60);
    if (end > endMinutes) endMinutes = Math.min(24 * 60, end + 60);
  }
  return { startMinutes, endMinutes };
}

export interface DayColumnLayout {
  session: ScheduleSession;
  column: number;
  columnCount: number;
}

/**
 * Atribui a cada aula de um único dia uma coluna (0-based) e o total de
 * colunas do grupo de sobreposição em que ela está, pra renderizar aulas
 * concorrentes lado a lado (igual ao Google Calendar faz com conflitos) em
 * vez de empilhadas por cima uma da outra. Usa `overlaps()` pra agrupar em
 * clusters de sobreposição, depois faz alocação gulosa de colunas dentro de
 * cada cluster (coloração ótima de grafo de intervalos).
 */
export function layoutDayColumns(sessions: ScheduleSession[]): DayColumnLayout[] {
  const sorted = [...sessions].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  const clusters: ScheduleSession[][] = [];
  for (const s of sorted) {
    const last = clusters[clusters.length - 1];
    const joinsLast = last?.some((c) =>
      overlaps(
        new Date(c.starts_at),
        c.duration_minutes,
        new Date(s.starts_at),
        s.duration_minutes,
      ),
    );
    if (joinsLast) {
      last.push(s);
    } else {
      clusters.push([s]);
    }
  }

  const result: DayColumnLayout[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    for (const s of cluster) {
      const start = Date.parse(s.starts_at);
      const end = start + s.duration_minutes * 60_000;
      let column = columnEnds.findIndex((colEnd) => colEnd <= start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[column] = end;
      }
      result.push({ session: s, column, columnCount: -1 });
    }
    const columnCount = columnEnds.length;
    for (const r of result.slice(-cluster.length)) {
      r.columnCount = columnCount;
    }
  }

  return result;
}

/** Agrupa sessões por chave YYYY-MM-DD do horário local. */
export function groupByDay(sessions: ScheduleSession[]): Record<string, ScheduleSession[]> {
  const map: Record<string, ScheduleSession[]> = {};
  for (const s of sessions) {
    const key = isoDate(new Date(s.starts_at));
    (map[key] ??= []).push(s);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  }
  return map;
}

export const WEEKDAY_LABEL_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const WEEKDAY_SHORT_PT: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
