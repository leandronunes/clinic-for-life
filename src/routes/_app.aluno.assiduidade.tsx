import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  ThumbsUp,
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
import { cn } from "@/lib/utils";
import { fetchCheckInHistory, type WorkoutCheckIn } from "@/lib/api/check-ins";
import type { Feedback, FeedbackKind } from "@/lib/api/feedbacks";
import { useAuth } from "@/contexts/use-auth";
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

const KIND_LABEL: Record<FeedbackKind, string> = {
  elogio: "Elogio",
  correcao: "Correção",
  incentivo: "Incentivo",
};

const KIND_BADGE_CLASS: Record<FeedbackKind, string> = {
  elogio: "bg-success text-success-foreground",
  correcao: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  incentivo: "",
};

type PeriodView = "dia" | "semana" | "mes";

interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

function getRange(view: PeriodView, anchor: Date): PeriodRange {
  if (view === "dia") {
    const start = startOfDay(anchor);
    return {
      start,
      end: start,
      label: format(start, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
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
      const d = new Date(ci.completed_at ?? ci.started_at);
      const key = format(d, "yyyy-MM-dd");
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
      const d = new Date(ci.completed_at ?? ci.started_at);
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

      <DayDetailsDialog
        day={selectedDay}
        checkIns={selectedDay ? dayCheckIns(selectedDay) : []}
        onClose={() => setSelectedDay(null)}
      />
    </div>
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
                c.status === "completed" ? "bg-success" : "bg-amber-500",
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
        <span className="h-2 w-2 rounded-full bg-success" /> Concluído
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

function CheckInRow({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const date = new Date(checkIn.completed_at ?? checkIn.started_at);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Dumbbell className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium">{checkIn.workout_title}</div>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {checkIn.exercises_completed}/{checkIn.exercises_total} exercícios
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {checkIn.reactions.length > 0 && (
          <span className="text-lg" aria-label="Reação do personal">
            {checkIn.reactions[0].emoji}
          </span>
        )}
        <Badge
          variant={checkIn.status === "completed" ? "default" : "secondary"}
          className={checkIn.status === "completed" ? "bg-success text-success-foreground" : ""}
        >
          {checkIn.status === "completed" ? "Concluído" : "Em andamento"}
        </Badge>
      </div>
    </div>
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
            {day && format(day, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
  const pct = checkIn.exercises_total
    ? Math.round((checkIn.exercises_completed / checkIn.exercises_total) * 100)
    : 0;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold">{checkIn.workout_title}</div>
        <Badge
          className={cn(checkIn.status === "completed" ? "bg-success text-success-foreground" : "")}
          variant={checkIn.status === "completed" ? "default" : "secondary"}
        >
          {checkIn.status === "completed" ? "Concluído" : "Em andamento"}
        </Badge>
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
      {(checkIn.feedbacks.length > 0 || checkIn.reactions.length > 0) && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ThumbsUp className="h-3.5 w-3.5" /> Feedback do Personal
          </h3>
          {checkIn.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {checkIn.reactions.map((reaction) => (
                <span
                  key={reaction.id}
                  className="rounded-full bg-muted px-2 py-1 text-base"
                  title={reaction.author_name ?? undefined}
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}
          {checkIn.feedbacks.map((feedback) => (
            <FeedbackCard key={feedback.id} feedback={feedback} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className={cn("text-[10px]", KIND_BADGE_CLASS[feedback.kind])}>
            {KIND_LABEL[feedback.kind]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(feedback.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
        <p className="text-sm">{feedback.message}</p>
        {feedback.author_name && (
          <p className="text-xs text-muted-foreground">— {feedback.author_name}</p>
        )}
      </CardContent>
    </Card>
  );
}
