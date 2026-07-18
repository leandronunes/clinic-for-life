import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AgendaCalendar, statusLabel, type AgendaView } from "@/components/agenda/AgendaCalendar";
import { fetchScheduleSessions, type ScheduleSession } from "@/lib/api/schedules";
import {
  addDays,
  endOfMonth,
  formatHM,
  isoDate,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LABEL_PT,
} from "@/lib/schedule";
import { useAuth } from "@/contexts/use-auth";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/aluno/agenda")({
  head: () =>
    pageHead({
      path: "/aluno/agenda",
      title: "Minha agenda de treinos — Núcleo For Life",
      description: "Veja sua agenda de treinos por dia, semana ou mês.",
    }),
  component: MinhaAgendaPage,
});

function MinhaAgendaPage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.aluno_id ?? user?.id ?? "";
  const navigate = useNavigate();
  const [view, setView] = useState<AgendaView>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<ScheduleSession | null>(null);

  const range = useMemo(() => rangeFor(view, cursor), [view, cursor]);
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["schedule", { studentId: alunoId, ...range }],
    queryFn: () => fetchScheduleSessions({ from: range.from, to: range.to, studentId: alunoId }),
    enabled: !!alunoId,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Minha agenda</h1>
        <p className="text-sm text-muted-foreground">
          Seus treinos programados. Clique em uma aula para abrir o treino do dia.
        </p>
      </div>

      <Toolbar view={view} setView={setView} cursor={cursor} setCursor={setCursor} />

      <Card>
        <CardContent className="p-3 md:p-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <AgendaCalendar
              view={view}
              cursor={cursor}
              sessions={sessions}
              onSelectSession={setSelected}
              onSelectDay={(d) => {
                setCursor(d);
                setView("day");
              }}
            />
          )}
        </CardContent>
      </Card>

      <SessionDetailsDialog
        session={selected}
        onClose={() => setSelected(null)}
        onOpenWorkout={() => {
          setSelected(null);
          navigate({ to: "/aluno" });
        }}
      />
    </div>
  );
}

interface ToolbarProps {
  view: AgendaView;
  setView: (v: AgendaView) => void;
  cursor: Date;
  setCursor: (d: Date) => void;
}

export function Toolbar({ view, setView, cursor, setCursor }: ToolbarProps) {
  const label = formatCursorLabel(view, cursor);
  const shift = (dir: -1 | 1) => {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Hoje
        </Button>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-sm font-medium capitalize">{label}</span>
      </div>
      <Tabs value={view} onValueChange={(v) => setView(v as AgendaView)}>
        <TabsList>
          <TabsTrigger value="day">Dia</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export function rangeFor(view: AgendaView, cursor: Date): { from: string; to: string } {
  if (view === "day") return { from: isoDate(cursor), to: isoDate(cursor) };
  if (view === "week") {
    const s = startOfWeek(cursor);
    return { from: isoDate(s), to: isoDate(addDays(s, 6)) };
  }
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const last = endOfMonth(cursor);
  const gridEnd = addDays(gridStart, 41);
  return { from: isoDate(gridStart), to: isoDate(gridEnd > last ? gridEnd : last) };
}

function formatCursorLabel(view: AgendaView, cursor: Date): string {
  if (view === "day") {
    return `${WEEKDAY_LABEL_PT[cursor.getDay()]}, ${cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`;
  }
  if (view === "week") {
    const s = startOfWeek(cursor);
    const e = addDays(s, 6);
    return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

interface SessionDetailsDialogProps {
  session: ScheduleSession | null;
  onClose: () => void;
  onOpenWorkout: () => void;
}

export function SessionDetailsDialog({
  session,
  onClose,
  onOpenWorkout,
}: SessionDetailsDialogProps) {
  return (
    <Dialog open={!!session} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {session && (
          <>
            <DialogHeader>
              <DialogTitle>Aula planejada</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div>
                <strong>
                  {new Date(session.starts_at).toLocaleDateString("pt-BR", { dateStyle: "full" })}
                </strong>
              </div>
              <div>
                Horário: <strong>{formatHM(new Date(session.starts_at))}</strong> ·{" "}
                {session.duration_minutes} min
              </div>
              <div>Status: {statusLabel(session.status)}</div>
              {session.notes && <p className="text-muted-foreground">{session.notes}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={onOpenWorkout}>
                <Play className="mr-2 h-4 w-4" /> Abrir treino do dia
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
