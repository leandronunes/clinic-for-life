import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RotateCw,
  Weight,
  Timer,
  Route as RouteIcon,
  Activity,
  HeartPulse,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExerciseVideoDialog } from "./exercise-video-dialog";
import type { Exercise, Workout } from "@/lib/api/workouts";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import { KIND_META, getKind, formatDuration } from "@/lib/exercise-kind";

type ExecPhase = "idle" | "executing" | "paused" | "resting" | "rest-done";

function formatClock(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function playRestAlert(): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200]);
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch {
    /* silêncio: alerta sonoro é apenas complementar */
  }
}

function StatBox({
  label,
  value,
  icon: Icon,
  highlight = false,
  children,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border bg-card px-2 py-2.5 text-center transition-colors",
        highlight && "border-primary/60 bg-primary/5",
      )}
    >
      {Icon && (
        <Icon
          className={cn("mb-1 h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
      )}
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 text-base font-bold tabular-nums", highlight && "text-primary")}>
        {value}
      </div>
      {children}
    </div>
  );
}

/** Small dots showing series progress: filled = done, ring = current, empty = pending. */
function SeriesDots({ current, total }: { current: number; total: number }) {
  if (total <= 1 || total > 8) return null;
  return (
    <div className="mt-1.5 flex items-center justify-center gap-1" aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const state = i + 1 < current ? "done" : i + 1 === current ? "current" : "pending";
        return (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              state === "done" && "bg-primary",
              state === "current" && "bg-primary/50 ring-2 ring-primary/40",
              state === "pending" && "bg-muted-foreground/25",
            )}
          />
        );
      })}
    </div>
  );
}

/** The only field of an exercise a student may edit — everything else about
 * the workout's structure stays personal/admin-only (see
 * ExercisesController#update on the backend). Tapping it swaps the value for
 * a number input; Enter/blur saves, Escape discards. */
function LoadStatBox({
  exercise,
  onUpdateLoad,
}: {
  exercise: Exercise;
  onUpdateLoad: (exerciseId: string, loadKg: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelRef = useRef(false);

  function commit() {
    setEditing(false);
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    if (parsed === (exercise.load_kg ?? null)) return;
    onUpdateLoad(exercise.id, parsed);
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-primary bg-card px-2 py-2.5 text-center">
        <Weight className="mb-1 h-4 w-4 text-primary" aria-hidden />
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Carga
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          autoFocus
          aria-label="Carga em quilos"
          className="mt-0.5 w-full rounded border bg-background text-center text-base font-bold tabular-nums outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelRef.current = true;
              e.currentTarget.blur();
            }
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(exercise.load_kg != null ? String(exercise.load_kg) : "");
        setEditing(true);
      }}
      className="flex flex-col items-center justify-center rounded-lg border bg-card px-2 py-2.5 text-center transition-colors hover:border-primary"
      aria-label={`Editar carga, atualmente ${exercise.load_kg ? `${exercise.load_kg} kg` : "não definida"}`}
    >
      <Weight className="mb-1 h-4 w-4 text-primary" aria-hidden />
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Carga
      </div>
      <div className="mt-0.5 text-base font-bold tabular-nums">
        {exercise.load_kg ? `${exercise.load_kg} kg` : "—"}
      </div>
    </button>
  );
}

interface ExecutionCardActiveState {
  phase: ExecPhase;
  currentSet: number;
  phaseLabel: string;
  clockValue: string;
  restProgress: number; // 0..1 (rest elapsed / total)
}

type TimerTone = "primary" | "success" | "amber";

const PHASE_BADGE: Record<
  ExecPhase,
  { icon: LucideIcon; badgeClass: string; tone: TimerTone; cardClass: string }
> = {
  idle: {
    icon: Play,
    badgeClass: "bg-muted text-muted-foreground",
    tone: "primary",
    cardClass: "border-border bg-muted/30",
  },
  paused: {
    icon: Pause,
    badgeClass: "bg-primary/10 text-primary",
    tone: "primary",
    cardClass: "border-primary/30 bg-primary/5",
  },
  executing: {
    icon: Play,
    badgeClass: "bg-success/10 text-success",
    tone: "success",
    cardClass: "border-success/60 bg-success/5",
  },
  resting: {
    icon: Clock,
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    tone: "amber",
    cardClass: "border-amber-500/60 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  "rest-done": {
    icon: CheckCircle2,
    badgeClass: "bg-success/15 text-success",
    tone: "success",
    cardClass: "animate-pulse border-success bg-success/15 text-success",
  },
};

const COMPLETED_BADGE = {
  icon: CheckCircle2,
  badgeClass: "bg-success/15 text-success",
  tone: "success" as TimerTone,
  cardClass: "border-success/60 bg-success/5",
};

/** One exercise's stats + timer + notes — rendered once per carousel slide in
 * ExecucaoTreinoDialog. Only the slide matching the dialog's `idx` receives a
 * live `active` state; every other (swiped-away) slide shows an idle
 * placeholder, since only one exercise's timer runs at a time — unless the
 * exercise was already completed in a previous pass, in which case it keeps
 * showing as done (full set count, success badge) instead of resetting back
 * to "Pronto para começar". */
function ExerciseExecutionCard({
  exercise,
  active,
  completed,
  onUpdateLoad,
}: {
  exercise: Exercise;
  active: ExecutionCardActiveState | null;
  completed: boolean;
  onUpdateLoad: (exerciseId: string, loadKg: number | null) => void;
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const kind = getKind(exercise);
  const isCardio = kind === "cardio";
  const totalSets = Math.max(1, exercise.sets ?? 1);
  const restSecs = exercise.rest_seconds ?? 0;

  const showAsCompleted = completed && !active;
  const phase = active?.phase ?? "idle";
  const currentSet = active?.currentSet ?? (showAsCompleted ? totalSets : 1);
  const phaseLabel = active?.phaseLabel ?? (showAsCompleted ? "Concluído" : "Pronto para começar");
  const clockValue = active?.clockValue ?? formatClock(0);
  const restProgress = active?.restProgress ?? 0;
  const badge = showAsCompleted ? COMPLETED_BADGE : PHASE_BADGE[phase];
  const BadgeIcon = badge.icon;
  // Executing/paused/idle count up with no fixed target, so the ring is a
  // full static frame for those — only "resting" has a real fraction to show.
  const ringProgress = phase === "resting" ? restProgress : 1;

  return (
    <div className="flex h-full flex-col gap-4 px-4 pb-4 sm:px-6">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {!isCardio ? (
          <>
            <StatBox label="Série" value={`${currentSet}/${totalSets}`} icon={TrendingUp} />
            <StatBox label="Repetições" value={exercise.reps ?? "—"} icon={RotateCw} />
            {kind === "strength" ? (
              <LoadStatBox exercise={exercise} onUpdateLoad={onUpdateLoad} />
            ) : (
              <StatBox label="Séries" value={`${totalSets}`} icon={Weight} />
            )}
          </>
        ) : (
          <>
            <StatBox
              label="Duração"
              value={exercise.duration_seconds ? formatDuration(exercise.duration_seconds) : "—"}
              icon={Timer}
            />
            <StatBox
              label="Distância"
              value={
                exercise.distance_value
                  ? `${exercise.distance_value} ${exercise.distance_unit ?? "m"}`
                  : "—"
              }
              icon={RouteIcon}
            />
            <StatBox
              label="Zona / FC"
              value={
                exercise.hr_zone
                  ? `Z${exercise.hr_zone}`
                  : exercise.heart_rate_bpm
                    ? `${exercise.heart_rate_bpm} bpm`
                    : "—"
              }
              icon={HeartPulse}
            />
          </>
        )}
      </div>

      {/* Big timer hero — takes remaining vertical space on mobile */}
      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center rounded-2xl border-2 p-6 text-center transition-colors",
          badge.cardClass,
        )}
        aria-live="polite"
      >
        <div
          className={cn(
            "mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            badge.badgeClass,
          )}
        >
          <BadgeIcon className="h-3.5 w-3.5" aria-hidden />
          {phaseLabel}
        </div>

        <TimerRing progress={ringProgress} value={clockValue} tone={badge.tone} />

        {!isCardio && restSecs > 0 && phase === "idle" && (
          <p className="mt-4 text-xs text-muted-foreground">
            Descanso configurado: <span className="font-medium">{restSecs}s</span>
          </p>
        )}
        {phase === "rest-done" && (
          <p className="mt-3 text-sm font-medium">
            {currentSet >= totalSets ? "Descanso finalizado!" : "Bora pra próxima série!"}
          </p>
        )}
      </div>

      {(exercise.notes || exercise.video_url) && (
        <div className="flex flex-wrap gap-2">
          {exercise.notes && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Dica do personal
                </Button>
              </PopoverTrigger>
              <PopoverContent className="text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Dica do personal</p>
                <p className="whitespace-pre-wrap break-words text-foreground/90">
                  {exercise.notes}
                </p>
              </PopoverContent>
            </Popover>
          )}
          {exercise.video_url && (
            <Button type="button" variant="outline" size="sm" onClick={() => setVideoOpen(true)}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> Ver execução
            </Button>
          )}
        </div>
      )}

      <ExerciseVideoDialog
        exercise={videoOpen ? exercise : null}
        onClose={() => setVideoOpen(false)}
      />
    </div>
  );
}

const TIMER_RING_TONE: Record<TimerTone, { track: string; fill: string }> = {
  primary: { track: "stroke-primary/15", fill: "stroke-primary" },
  success: { track: "stroke-success/15", fill: "stroke-success" },
  amber: { track: "stroke-amber-500/20", fill: "stroke-amber-500" },
};

/** Circular dial around the clock digits — a real countdown fraction during
 * rest, a full static ring elsewhere (executing/paused count up with no
 * fixed target, so there's no meaningful fraction to show). */
function TimerRing({
  progress,
  value,
  tone,
}: {
  progress: number;
  value: string;
  tone: TimerTone;
}) {
  const size = 180;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const { track, fill } = TIMER_RING_TONE[tone];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className={cn("fill-none", track)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("fill-none transition-[stroke-dashoffset] duration-500 ease-linear", fill)}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">{value}</span>
      </div>
    </div>
  );
}

export function ExecucaoTreinoDialog({
  open,
  onOpenChange,
  treino,
  checkIn,
  onToggleExercise,
  onUpdateLoad,
  focusExerciseId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  treino: Workout;
  checkIn: WorkoutCheckIn;
  onToggleExercise: (exerciseId: string, completed: boolean) => void;
  /** The student may edit only this field of their own exercise — see
   * LoadStatBox. */
  onUpdateLoad: (exerciseId: string, loadKg: number | null) => void;
  /** Exercise to open the dialog on (e.g. clicked directly from the workout
   * list), taking priority over resuming the started/first-pending one. */
  focusExerciseId?: string | null;
}) {
  const exercises = useMemo(
    () => [...treino.exercises].sort((a, b) => a.position - b.position),
    [treino.exercises],
  );

  const firstPendingIdx = useMemo(() => {
    const i = exercises.findIndex((e) => !checkIn.completed_exercise_ids.includes(e.id));
    return i === -1 ? 0 : i;
  }, [exercises, checkIn.completed_exercise_ids]);

  const [idx, setIdx] = useState(firstPendingIdx);

  // O exercício "iniciado" (com o cronômetro rodando/pausado) é independente
  // do exercício sendo visualizado (`idx`) — navegar pelos cards (swipe ou
  // setas) nunca para o cronômetro. Só existe um por vez: só é possível
  // iniciar outro depois que este for concluído (ver handleConcluir).
  const [startedIdx, setStartedIdx] = useState<number | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<ExecPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const startedIdxRef = useRef(startedIdx);
  startedIdxRef.current = startedIdx;
  const firstPendingIdxRef = useRef(firstPendingIdx);
  firstPendingIdxRef.current = firstPendingIdx;
  const focusExerciseIdRef = useRef(focusExerciseId);
  focusExerciseIdRef.current = focusExerciseId;
  useEffect(() => {
    if (!open) return;
    const focusIdx = focusExerciseIdRef.current
      ? exercises.findIndex((e) => e.id === focusExerciseIdRef.current)
      : -1;
    setIdx(focusIdx !== -1 ? focusIdx : (startedIdxRef.current ?? firstPendingIdxRef.current));
  }, [open, exercises]);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setIdx(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);
  useEffect(() => {
    carouselApi?.scrollTo(idx);
  }, [carouselApi, idx]);

  const current = exercises[idx];
  const kind = current ? getKind(current) : "strength";
  const totalSets = Math.max(1, current?.sets ?? 1);
  const restSecs = current?.rest_seconds ?? 0;
  const isViewingStarted = startedIdx !== null && idx === startedIdx;

  useEffect(() => {
    if (phase === "executing") {
      const t = window.setInterval(() => setElapsed((v) => v + 1), 1000);
      return () => window.clearInterval(t);
    }
    if (phase === "resting") {
      const t = window.setInterval(() => {
        setRemaining((v) => {
          if (v <= 1) {
            window.clearInterval(t);
            setPhase("rest-done");
            playRestAlert();
            return 0;
          }
          return v - 1;
        });
      }, 1000);
      return () => window.clearInterval(t);
    }
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (open && checkIn.status === "completed") onOpenChange(false);
  }, [open, checkIn.status, onOpenChange]);

  if (!current) return null;

  const isLastSet = currentSet >= totalSets;
  const isCardio = kind === "cardio";
  const alreadyCompleted = checkIn.completed_exercise_ids.includes(current.id);

  function goToNext(markedId?: string) {
    const done = new Set(checkIn.completed_exercise_ids);
    if (markedId) done.add(markedId);
    const nextIdx = exercises.findIndex((e, i) => i > idx && !done.has(e.id));
    if (nextIdx === -1) {
      onOpenChange(false);
    } else {
      setIdx(nextIdx);
    }
  }

  function handleConcluir() {
    if (!alreadyCompleted) onToggleExercise(current.id, true);
    if (isViewingStarted) {
      setStartedIdx(null);
      setCurrentSet(1);
      setPhase("idle");
      setElapsed(0);
      setRemaining(0);
    }
    goToNext(current.id);
  }

  const phaseLabel =
    phase === "idle"
      ? "Pronto para começar"
      : phase === "executing"
        ? "Executando"
        : phase === "paused"
          ? "Pausado"
          : phase === "resting"
            ? "Descansando"
            : "Descanso finalizado — bora!";

  const clockValue =
    phase === "resting"
      ? formatClock(remaining)
      : phase === "executing" || phase === "paused"
        ? formatClock(elapsed)
        : phase === "rest-done"
          ? "00:00"
          : formatClock(0);

  const restProgress = restSecs > 0 ? (restSecs - remaining) / restSecs : 0;

  // ---- Contextual primary CTA (large button at the bottom) ---------------
  type PrimaryAction = {
    label: string;
    icon: typeof Play;
    onClick: () => void;
    tone?: "success" | "amber" | "primary";
  };
  let primary: PrimaryAction | null = null;

  if (!isViewingStarted && alreadyCompleted) {
    // Already concluded and not the one currently running — offer to undo
    // instead of letting "Iniciar série"/"Concluir exercício" fire again on
    // a finished exercise (see the "Concluir exercício" button below, which
    // is hidden in this same state).
    primary = {
      label: "Reiniciar série",
      icon: RotateCcw,
      tone: "primary",
      onClick: () => onToggleExercise(current.id, false),
    };
  } else if (!isViewingStarted) {
    primary = {
      label: isCardio ? "Iniciar cardio" : `Iniciar série ${currentSet}`,
      icon: Play,
      onClick: () => {
        setStartedIdx(idx);
        setCurrentSet(1);
        setElapsed(0);
        setPhase("executing");
      },
    };
  } else if (phase === "idle") {
    primary = {
      label: isCardio ? "Iniciar cardio" : `Iniciar série ${currentSet}`,
      icon: Play,
      onClick: () => {
        setElapsed(0);
        setPhase("executing");
      },
    };
  } else if (phase === "paused") {
    primary = { label: "Retomar", icon: Play, onClick: () => setPhase("executing") };
  } else if (phase === "executing") {
    // Resting is meaningful even after the last set (still a real rest
    // period) — only "Próxima série" needs a next set to make sense of.
    if (!isCardio && restSecs > 0) {
      primary = {
        label: `Iniciar descanso (${restSecs}s)`,
        icon: Clock,
        tone: "amber",
        onClick: () => {
          setRemaining(restSecs);
          setPhase("resting");
        },
      };
    } else if (!isCardio && !isLastSet) {
      primary = {
        label: "Próxima série",
        icon: ChevronRight,
        onClick: () => {
          setCurrentSet((s) => s + 1);
          setElapsed(0);
          setPhase("idle");
        },
      };
    }
  } else if (phase === "rest-done") {
    primary = isLastSet
      ? {
          label: "Concluir exercício",
          icon: CheckCircle2,
          tone: "success",
          onClick: handleConcluir,
        }
      : {
          label: `Iniciar série ${currentSet + 1}`,
          icon: Play,
          tone: "success",
          onClick: () => {
            setCurrentSet((s) => s + 1);
            setElapsed(0);
            setPhase("executing");
          },
        };
  }

  const canDisableStart = !isViewingStarted && startedIdx !== null;
  const startedName = startedIdx !== null ? exercises[startedIdx]?.name : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Mobile: fullscreen edge-to-edge
          "left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0",
          // Desktop (sm+): centered dialog
          "sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border",
        )}
      >
        {/* Sticky header — extra right padding clears the dialog's built-in
            close (X) button, which sits absolutely at top-4 right-4. */}
        <DialogHeader className="shrink-0 space-y-0 border-b bg-card/95 py-4 pl-4 pr-12 backdrop-blur sm:pl-6 sm:pr-14">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Exercício anterior"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-center text-lg font-semibold sm:text-xl">
                {current.name}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-center text-xs">
                Exercício {idx + 1} de {exercises.length} · {KIND_META[kind].label}
                {current.muscle_group ? ` · ${current.muscle_group}` : ""}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Próximo exercício"
              disabled={idx === exercises.length - 1}
              onClick={() => setIdx((i) => Math.min(exercises.length - 1, i + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Slim progress bar of exercise position */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((idx + 1) / exercises.length) * 100}%` }}
            />
          </div>
        </DialogHeader>

        {/* Scrollable body: swipeable exercise cards */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Carousel setApi={setCarouselApi} opts={{ startIndex: idx }} className="h-full">
            <CarouselContent className="-ml-0 h-full">
              {exercises.map((ex, i) => (
                <CarouselItem
                  key={ex.id}
                  aria-label={ex.name}
                  className="h-full overflow-y-auto pl-0 pt-4"
                >
                  <ExerciseExecutionCard
                    exercise={ex}
                    active={
                      i === startedIdx
                        ? { phase, currentSet, phaseLabel, clockValue, restProgress }
                        : null
                    }
                    completed={checkIn.completed_exercise_ids.includes(ex.id)}
                    onUpdateLoad={onUpdateLoad}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Sticky footer action bar — DialogFooter defaults to a right-aligned
            row on sm+ (for typical Cancel/Confirm footers), which must be
            overridden back to a stacked column since this footer has full-width
            rows (primary CTA, secondary controls, the "concluir" link). */}
        <DialogFooter
          className={cn(
            "shrink-0 flex-col justify-start gap-2 border-t bg-card/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur sm:flex-col sm:justify-start sm:space-x-0 sm:px-6 sm:pb-6 sm:pt-4",
          )}
        >
          {/* Primary CTA */}
          {primary ? (
            <Button
              className={cn(
                "h-14 w-full text-base font-semibold shadow-sm",
                primary.tone === "success" &&
                  "bg-success text-success-foreground hover:bg-success/90",
                primary.tone === "amber" &&
                  "border-2 border-amber-500/60 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30",
                primary.tone === "primary" &&
                  "border-2 border-primary/60 bg-primary/15 text-primary hover:bg-primary/25",
              )}
              disabled={canDisableStart}
              onClick={primary.onClick}
            >
              <primary.icon className="mr-2 h-5 w-5" />
              {primary.label}
            </Button>
          ) : phase === "resting" ? (
            <div className="flex h-14 w-full items-center justify-center rounded-md border-2 border-dashed border-amber-500/50 bg-amber-500/5 text-sm font-medium text-amber-700 dark:text-amber-300">
              Aproveite o descanso…
            </div>
          ) : null}

          {canDisableStart && !isViewingStarted && startedName && (
            <p className="text-center text-xs text-muted-foreground">
              Conclua &quot;{startedName}&quot; para iniciar este exercício.
            </p>
          )}

          {/* Secondary controls row — while executing, "Parar" and the reset
              icon sit side by side; once paused, "Parar" is gone (it already
              did its job), so the reset button takes over that same slot at
              full size instead of being left as a small orphaned icon. */}
          {isViewingStarted && (phase === "executing" || phase === "paused") && (
            <div className="flex w-full items-center gap-2">
              {phase === "executing" && (
                <>
                  <Button
                    className="h-11 flex-1 border-2 border-destructive/60 bg-destructive/15 text-destructive hover:bg-destructive/25"
                    onClick={() => setPhase("paused")}
                  >
                    <Pause className="mr-1.5 h-4 w-4" /> Parar
                  </Button>
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0 border-2 border-primary/60 bg-primary/15 text-primary hover:bg-primary/25"
                    aria-label="Zerar cronômetro"
                    onClick={() => setElapsed(0)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
              {phase === "paused" && (
                <Button
                  className="h-11 flex-1 border-2 border-primary/60 bg-primary/15 text-primary hover:bg-primary/25"
                  onClick={() => setElapsed(0)}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Zerar cronômetro
                </Button>
              )}
            </div>
          )}

          {isViewingStarted && phase === "resting" && (
            <Button
              variant="ghost"
              className="h-11 w-full text-muted-foreground"
              onClick={() => {
                setPhase("rest-done");
                setRemaining(0);
              }}
            >
              Pular descanso
            </Button>
          )}

          {!(alreadyCompleted && !isViewingStarted) && (
            <Button
              className="h-10 w-full border-2 border-success/60 bg-success/15 text-sm text-success hover:bg-success/25"
              onClick={handleConcluir}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {idx + 1 < exercises.length
                ? "Concluir exercício e ir para o próximo"
                : "Concluir exercício e fechar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
