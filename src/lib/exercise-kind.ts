import { Dumbbell, HeartPulse, Waves } from "lucide-react";
import type { Exercise, ExerciseKind } from "@/lib/api/workouts";

export function getKind(ex: Exercise): ExerciseKind {
  return ex.kind ?? "strength";
}

export interface KindMeta {
  label: string;
  addLabel: string;
  formHint: string;
  namePlaceholder: string;
  icon: typeof Dumbbell;
  rowClass: string;
  badgeClass: string;
  chipClass: string;
  buttonClass: string;
}

export const KIND_META: Record<ExerciseKind, KindMeta> = {
  strength: {
    label: "Exercício",
    addLabel: "Adicionar exercício / série",
    formHint: "Cadastre o exercício com séries, repetições, carga e descanso.",
    namePlaceholder: "Ex.: Supino reto com barra",
    icon: Dumbbell,
    rowClass: "border-border bg-card/50 hover:border-primary/40",
    badgeClass: "bg-muted text-muted-foreground",
    chipClass: "",
    buttonClass: "",
  },
  cardio: {
    label: "Cardio",
    addLabel: "Adicionar cardio",
    formHint: "Defina tempo, distância, zona/intensidade e frequência cardíaca.",
    namePlaceholder: "Ex.: Corrida na esteira",
    icon: HeartPulse,
    rowClass:
      "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60 dark:border-rose-400/30 dark:bg-rose-400/10",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    chipClass: "border-rose-500/40 text-rose-600 dark:text-rose-300",
    buttonClass: "border-rose-400/50 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300",
  },
  mobility: {
    label: "Mobilidade",
    addLabel: "Adicionar mobilidade",
    formHint: "Cadastre o movimento de mobilidade com séries e repetições.",
    namePlaceholder: "Ex.: Alongamento de quadril",
    icon: Waves,
    rowClass:
      "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/60 dark:border-sky-400/30 dark:bg-sky-400/10",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    chipClass: "border-sky-500/40 text-sky-600 dark:text-sky-300",
    buttonClass: "border-sky-400/50 text-sky-600 hover:bg-sky-500/10 dark:text-sky-300",
  },
};

export function secondsToMMSS(total: number): string {
  if (!total || total <= 0) return "";
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function mmssToSeconds(value: string): number {
  // O campo reformata para "mm:ss" a cada tecla digitada, então o valor bruto
  // do input mistura os dígitos já formatados com o novo dígito digitado.
  // Extraímos apenas os dígitos e os alinhamos à direita (ss=últimos 2, mm=o resto),
  // em vez de reinterpretar o "mm:ss" já exibido, para não acumular dígitos.
  const digits = value.replace(/\D/g, "").slice(-4);
  if (!digits) return 0;
  const s = Number(digits.slice(-2));
  const m = Number(digits.slice(0, -2) || "0");
  return Math.max(0, m * 60 + s);
}

export function formatDuration(total: number): string {
  const mmss = secondsToMMSS(total);
  return mmss || `${total}s`;
}

export function describeExercise(ex: Exercise): string {
  const kind = getKind(ex);
  if (kind === "strength") {
    return `${ex.sets ?? 0} séries × ${ex.reps ?? "-"} reps · Descanso ${ex.rest_seconds ?? 0}s`;
  }
  if (kind === "mobility") {
    return `Mobilidade · ${ex.sets ?? 0} séries × ${ex.reps ?? "-"}`;
  }
  const parts: string[] = ["Cardio"];
  if (ex.duration_seconds) parts.push(formatDuration(ex.duration_seconds));
  if (ex.distance_value) parts.push(`${ex.distance_value} ${ex.distance_unit ?? "m"}`);
  if (ex.hr_zone) parts.push(`Zona ${ex.hr_zone}`);
  if (ex.heart_rate_bpm) parts.push(`${ex.heart_rate_bpm} bpm`);
  return parts.join(" · ");
}
