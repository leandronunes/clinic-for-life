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
