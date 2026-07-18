import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  History,
  Loader2,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  fetchCheckInHistory,
  deleteCheckIn,
  claimCheckIn,
  type WorkoutCheckIn,
  type CheckInPerformedBy,
} from "@/lib/api/check-ins";
import type { CheckInFeedback } from "@/lib/api/check-in-feedbacks";
import { fetchAttendanceCycleHistory } from "@/lib/api/attendance-cycles";
import { PseScale } from "@/components/treino/pse-scale";
import {
  checkInEffectiveDate,
  formatCheckInDateTime,
  checkInCompletionPercentage,
} from "@/lib/check-in-format";
import { CycleHistoryRow } from "@/components/CycleHistoryRow";
import { useAuth } from "@/contexts/use-auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/aluno/assiduidade")({
  head: () =>
    pageHead({
      path: "/aluno/assiduidade",
      title: "Assiduidade — Núcleo For Life",
      description: "Visualize os treinos executados por dia, semana ou mês.",
    }),
  component: AssiduidadePage,
});

type PeriodView = "dia" | "semana" | "mes";

interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

/** "quinta-feira, 16 de julho de 2026" — the full weekday+date label used
 * both as the "dia" view's period label and the day-detail dialog title. */
function formatFullDate(date: Date): string {
  return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function getRange(view: PeriodView, anchor: Date): PeriodRange {
  if (view === "dia") {
    const start = startOfDay(anchor);
    return {
      start,
      end: start,
      label: formatFullDate(start),
    };
  }
  if (view === "semana") {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    return {
      start,
      end,
      label: `${format(start, "dd MMM", { locale: ptBR })} — ${format(end, "dd MMM yyyy", { locale: ptBR })}`,
    };
  }
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  return {
    start,
    end,
    label: format(anchor, "MMMM 'de' yyyy", { locale: ptBR }),
  };
}

function shiftAnchor(view: PeriodView, anchor: Date, dir: 1 | -1): Date {
  if (view === "dia") return addDays(anchor, dir);
  if (view === "semana") return addWeeks(anchor, dir);
  return addMonths(anchor, dir);
}

export function AssiduidadePage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";

  const [view, setView] = useState<PeriodView>("dia");
  const [anchor, setAnchorState] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ["check-in", "history", alunoId],
    queryFn: () => fetchCheckInHistory(alunoId),
    enabled: !!alunoId,
  });

  // Group check-ins by ISO date (yyyy-MM-dd)
  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutCheckIn[]>();
    for (const ci of historico) {
      const key = format(checkInEffectiveDate(ci), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(ci);
      map.set(key, arr);
    }
    return map;
  }, [historico]);

  // Default anchor: most recent check-in date, or today.
  const effectiveAnchor = useMemo(() => {
    if (anchor) return anchor;
    if (historico.length === 0) return new Date();
    const latest = historico.reduce((acc, ci) => {
      const d = checkInEffectiveDate(ci);
      return d > acc ? d : acc;
    }, new Date(0));
    return latest;
  }, [anchor, historico]);

  const setAnchor = (updater: Date | ((prev: Date) => Date)) => {
    setAnchorState((prev) => {
      const base = prev ?? effectiveAnchor;
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const range = useMemo(() => getRange(view, effectiveAnchor), [view, effectiveAnchor]);

  const dayCheckIns = (d: Date) => byDay.get(format(d, "yyyy-MM-dd")) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Assiduidade</h1>
          <p className="text-sm text-muted-foreground">
            Visualize quando você executou seus treinos.
          </p>
        </div>
      </div>

      {!loadingHistorico && <TodayFeedbackBanner byDay={byDay} />}

      <Card className="shadow-soft">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={view} onValueChange={(v) => setView(v as PeriodView)}>
              <TabsList>
                <TabsTrigger value="dia">Dia</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Período anterior"
                onClick={() => setAnchor((a) => shiftAnchor(view, a, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center text-sm font-medium capitalize">
                {range.label}
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Próximo período"
                onClick={() => setAnchor((a) => shiftAnchor(view, a, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
                Hoje
              </Button>
            </div>
          </div>

          {loadingHistorico ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <PeriodView
              view={view}
              anchor={effectiveAnchor}
              range={range}
              dayCheckIns={dayCheckIns}
              onSelectDay={(d) => {
                if (dayCheckIns(d).length > 0) setSelectedDay(d);
              }}
            />
          )}
        </CardContent>
      </Card>

      <CycleHistoryCard alunoId={alunoId} />

      <DayDetailsDialog
        day={selectedDay}
        checkIns={selectedDay ? dayCheckIns(selectedDay) : []}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

function CycleHistoryCard({ alunoId }: { alunoId: string }) {
  const enabled = !!alunoId && isFeatureEnabled("attendanceCycles");
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["attendance-cycles", alunoId],
    queryFn: () => fetchAttendanceCycleHistory(alunoId),
    enabled,
  });

  if (!enabled || isLoading || history.length === 0) return null;

  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold">Histórico de ciclos</span>
        </div>
        <ul className="divide-y rounded-lg border">
          {history.map((cycle) => (
            <CycleHistoryRow key={cycle.id} cycle={cycle} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PeriodView({
  view,
  anchor,
  range,
  dayCheckIns,
  onSelectDay,
}: {
  view: PeriodView;
  anchor: Date;
  range: PeriodRange;
  dayCheckIns: (d: Date) => WorkoutCheckIn[];
  onSelectDay: (d: Date) => void;
}) {
  if (view === "dia") {
    const items = dayCheckIns(anchor);
    if (items.length === 0) {
      return <EmptyDay />;
    }
    return (
      <div className="space-y-2">
        {items.map((ci) => (
          <CheckInRow key={ci.id} checkIn={ci} />
        ))}
      </div>
    );
  }

  if (view === "semana") {
    const days = eachDayOfInterval({ start: range.start, end: range.end });
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => (
            <DayCell
              key={d.toISOString()}
              day={d}
              checkIns={dayCheckIns(d)}
              onClick={() => onSelectDay(d)}
            />
          ))}
        </div>
        <Legend />
      </div>
    );
  }

  // mes: full calendar grid, weeks starting Monday
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <DayCell
            key={d.toISOString()}
            day={d}
            checkIns={dayCheckIns(d)}
            compact
            muted={!isSameMonth(d, anchor)}
            onClick={() => onSelectDay(d)}
          />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function DayCell({
  day,
  checkIns,
  compact,
  muted,
  onClick,
}: {
  day: Date;
  checkIns: WorkoutCheckIn[];
  compact?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  const hasCompleted = checkIns.some((c) => c.status === "completed");
  const hasInProgress = checkIns.some((c) => c.status === "in_progress");
  const has = checkIns.length > 0;
  const today = isToday(day);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!has}
      aria-label={`${format(day, "dd/MM/yyyy")} — ${has ? `${checkIns.length} treino(s)` : "sem treino"}`}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-lg border p-2 text-center transition",
        compact ? "aspect-square" : "min-h-[80px]",
        muted && "opacity-40",
        has ? "cursor-pointer hover:border-primary" : "cursor-default",
        hasCompleted && "border-success/40 bg-success/10",
        !hasCompleted && hasInProgress && "border-amber-500/40 bg-amber-500/10",
        today && "ring-2 ring-primary/60",
      )}
    >
      {!compact && (
        <div className="text-[10px] font-medium uppercase text-muted-foreground">
          {format(day, "EEE", { locale: ptBR })}
        </div>
      )}
      <div className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>{format(day, "d")}</div>
      {has ? (
        <div className="mt-1 flex items-center gap-1">
          {checkIns.slice(0, 3).map((c) => (
            <span
              key={c.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                c.status !== "completed"
                  ? "bg-amber-500"
                  : c.performed_by === "personal"
                    ? "bg-success"
                    : "bg-primary",
              )}
            />
          ))}
          {checkIns.length > 3 && (
            <span className="text-[9px] text-muted-foreground">+{checkIns.length - 3}</span>
          )}
        </div>
      ) : compact ? null : (
        <div className="mt-1 text-[10px] text-muted-foreground">—</div>
      )}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-success" /> Confirmado pelo personal
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary" /> Feito pelo aluno
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-500" /> Em andamento
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-border" /> Sem treino
      </span>
    </div>
  );
}

function EmptyDay() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      Nenhum check-in registrado ainda.
    </div>
  );
}

/** Distingue visualmente quem fez o check-in: só o "personal" conta no
 * ciclo de atendimento (ver claimCheckIn) — os dois estados sempre aparecem
 * marcados, nunca um implícito pela ausência do outro. */
function PerformedByBadge({ performedBy }: { performedBy: CheckInPerformedBy }) {
  if (performedBy === "aluno") {
    return <Badge variant="outline">Feito pelo aluno</Badge>;
  }
  return (
    <Badge variant="outline" className="border-success/40 text-success">
      <BadgeCheck className="mr-1 h-3 w-3" /> Confirmado pelo personal
    </Badge>
  );
}

/** "Concluído" vs "Em andamento" — shared between CheckInRow and
 * CheckInDetail so the two views never drift out of sync. */
function CheckInStatusBadge({ status }: { status: WorkoutCheckIn["status"] }) {
  return (
    <Badge
      variant={status === "completed" ? "default" : "secondary"}
      className={status === "completed" ? "bg-success text-success-foreground" : ""}
    >
      {status === "completed" ? "Concluído" : "Em andamento"}
    </Badge>
  );
}

function CheckInRow({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const date = checkInEffectiveDate(checkIn);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Dumbbell className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium">{checkIn.workout_title}</div>
          <p className="text-xs text-muted-foreground">
            {formatCheckInDateTime(date)} · {checkIn.exercises_completed}/{checkIn.exercises_total}{" "}
            exercícios
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {checkIn.feedbacks.some((f) => f.emoji) && (
          <div className="flex gap-0.5" aria-label="Reação do personal">
            {checkIn.feedbacks
              .filter((f) => f.emoji)
              .map((f) => (
                <span key={f.id} className="text-lg">
                  {f.emoji}
                </span>
              ))}
          </div>
        )}
        <PseScale value={checkIn.pse} readOnly />
        <CheckInStatusBadge status={checkIn.status} />
        <PerformedByBadge performedBy={checkIn.performed_by} />
        <ClaimCheckInButton checkIn={checkIn} />
        <DeleteCheckInButton checkIn={checkIn} />
      </div>
    </div>
  );
}

/** Both "check-in" queries (this aluno's history, and the current check-in
 * for a specific workout) go stale together whenever a check-in is deleted
 * or claimed — shared by DeleteCheckInButton and ClaimCheckInButton so the
 * two mutations can't drift apart on which keys they invalidate. */
function invalidateCheckInQueries(qc: QueryClient, checkIn: WorkoutCheckIn) {
  qc.invalidateQueries({ queryKey: ["check-in", "history", checkIn.student_id] });
  qc.invalidateQueries({
    queryKey: ["check-in", "current", checkIn.student_id, checkIn.workout_id],
  });
}

/** Shared between "dia" view's CheckInRow and the day-detail dialog's
 * CheckInDetail — both need to offer removing the check-in. Once the
 * personal has performed/confirmed a check-in, only staff (not the aluno
 * themselves) may still remove it — mirrors the backend's destroy guard. */
function DeleteCheckInButton({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const qc = useQueryClient();
  const { canWrite: isStaff } = useAuth();
  const deleteMut = useMutation({
    mutationFn: () => deleteCheckIn(checkIn.student_id, checkIn.workout_id, checkIn.id),
    onSuccess: () => {
      toast.success("Check-in removido");
      invalidateCheckInQueries(qc, checkIn);
    },
    onError: () => toast.error("Não foi possível remover o check-in"),
  });

  if (checkIn.performed_by === "personal" && !isStaff) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          aria-label={`Remover check-in de "${checkIn.workout_title}"`}
          disabled={deleteMut.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover este check-in?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Os exercícios marcados e o feedback recebido neste
            check-in de &quot;{checkIn.workout_title}&quot; serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Staff-only: confirms a check-in the aluno performed themselves, so it
 * starts counting toward the personal's attendance cycle — same action
 * offered in Treinos Concluídos and Assiduidade dos alunos. */
function ClaimCheckInButton({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const qc = useQueryClient();
  const { canWrite: isStaff } = useAuth();
  const claimMut = useMutation({
    mutationFn: () => claimCheckIn(checkIn.student_id, checkIn.workout_id, checkIn.id),
    onSuccess: () => {
      toast.success("Check-in confirmado — agora conta no ciclo de atendimento");
      invalidateCheckInQueries(qc, checkIn);
    },
    onError: () => toast.error("Não foi possível confirmar o check-in"),
  });

  if (!isStaff || checkIn.performed_by !== "aluno") return null;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => claimMut.mutate()}
      disabled={claimMut.isPending}
    >
      <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Confirmar check-in
    </Button>
  );
}

function DayDetailsDialog({
  day,
  checkIns,
  onClose,
}: {
  day: Date | null;
  checkIns: WorkoutCheckIn[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            {day && formatFullDate(day)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {checkIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treino neste dia.</p>
          ) : (
            checkIns.map((ci) => <CheckInDetail key={ci.id} checkIn={ci} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckInDetail({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const started = new Date(checkIn.started_at);
  const completed = checkIn.completed_at ? new Date(checkIn.completed_at) : null;
  const durationMin =
    completed && isSameDay(started, completed)
      ? Math.max(1, Math.round((completed.getTime() - started.getTime()) / 60000))
      : null;
  const pct = checkInCompletionPercentage(checkIn);

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold">{checkIn.workout_title}</div>
        <div className="flex items-center gap-2">
          <CheckInStatusBadge status={checkIn.status} />
          <PerformedByBadge performedBy={checkIn.performed_by} />
          <ClaimCheckInButton checkIn={checkIn} />
          <DeleteCheckInButton checkIn={checkIn} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Início</div>
          <div className="font-medium">
            {started.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Fim</div>
          <div className="font-medium">
            {completed
              ? completed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </div>
        </div>
        {durationMin && (
          <div>
            <div className="text-muted-foreground">Duração</div>
            <div className="font-medium">{durationMin} min</div>
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Exercícios {checkIn.exercises_completed}/{checkIn.exercises_total}
          </span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all",
              checkIn.status === "completed" ? "bg-success" : "bg-amber-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <PseScale value={checkIn.pse} readOnly />
      {checkIn.feedbacks.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ThumbsUp className="h-3.5 w-3.5" /> Feedback do Personal
          </h3>
          <FeedbackList feedbacks={checkIn.feedbacks} variant="detail" />
        </div>
      )}
    </div>
  );
}

/** Renders a feedback list's emoji reactions and text messages — shared
 * between CheckInDetail (inside a bordered detail card) and
 * TodayFeedbackBanner (inside a colored highlight card), which only differ
 * in how each item is styled against its container. */
function FeedbackList({
  feedbacks,
  variant,
}: {
  feedbacks: CheckInFeedback[];
  variant: "detail" | "banner";
}) {
  const emojiFeedbacks = feedbacks.filter((f) => f.emoji);
  const messageFeedbacks = feedbacks.filter((f) => f.message);
  const isBanner = variant === "banner";

  return (
    <>
      {emojiFeedbacks.length > 0 && (
        <div className={cn("flex flex-wrap", isBanner ? "gap-2" : "gap-1")}>
          {emojiFeedbacks.map((f) => (
            <span
              key={f.id}
              className={cn(
                "rounded-full px-2 py-1",
                isBanner ? "bg-background text-xl shadow-sm" : "bg-muted text-base",
              )}
              title={f.author_name ?? undefined}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      )}
      {messageFeedbacks.length > 0 && (
        <ul className="space-y-2">
          {messageFeedbacks.map((f) => (
            <li
              key={f.id}
              className={cn(
                "rounded-lg p-3 text-sm",
                isBanner ? "bg-background shadow-sm" : "bg-muted/50",
              )}
            >
              <p>{f.message}</p>
              {f.author_name && (
                <p className="mt-1 text-xs text-muted-foreground">— {f.author_name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TodayFeedbackBanner({ byDay }: { byDay: Map<string, WorkoutCheckIn[]> }) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCheckIns = byDay.get(todayKey) ?? [];
  const todayFeedbacks = todayCheckIns.flatMap((ci) => ci.feedbacks);

  if (todayFeedbacks.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-soft">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold">Feedback do personal de hoje</span>
        </div>
        <FeedbackList feedbacks={todayFeedbacks} variant="banner" />
      </CardContent>
    </Card>
  );
}
