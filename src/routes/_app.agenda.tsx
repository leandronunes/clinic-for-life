import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AgendaCalendar, statusLabel } from "@/components/agenda/AgendaCalendar";
import {
  Toolbar,
  rangeFor,
  SessionDetailsDialog as _AlunoDetails,
} from "./_app.aluno.agenda";
import {
  deleteScheduleSession,
  fetchScheduleSessions,
  type ScheduleSession,
} from "@/lib/api/schedules";
import { fetchStudents } from "@/lib/api/students";
import { PlanejarAulasDialog } from "@/components/agenda/PlanejarAulasDialog";
import { useAuth } from "@/contexts/use-auth";
import { formatHM } from "@/lib/schedule";
import { pageHead } from "@/lib/seo";
import type { AgendaView } from "@/components/agenda/AgendaCalendar";

// Consumido para não deixar o TS reclamar do import — dialog reaproveitado abaixo.
void _AlunoDetails;

export const Route = createFileRoute("/_app/agenda")({
  head: () =>
    pageHead({
      path: "/agenda",
      title: "Agenda de aulas — Núcleo For Life",
      description: "Agenda dinâmica de treinos dos seus alunos por dia, semana ou mês.",
    }),
  component: AgendaPersonalPage,
});

function AgendaPersonalPage() {
  const { user, hasRole } = useAuth();
  const isPersonal = hasRole("personal");
  const trainerId = isPersonal ? (user?.personal_id ?? undefined) : undefined;

  const [view, setView] = useState<AgendaView>("week");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ScheduleSession | null>(null);
  const qc = useQueryClient();

  const range = useMemo(() => rangeFor(view, cursor), [view, cursor]);
  const { data: students = [] } = useQuery({
    queryKey: ["alunos", trainerId ?? "all"],
    queryFn: () => fetchStudents({ trainerId, status: "active" }),
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: [
      "schedule",
      { trainerId: trainerId ?? "all", studentId: studentFilter, ...range },
    ],
    queryFn: () =>
      fetchScheduleSessions({
        from: range.from,
        to: range.to,
        trainerId,
        studentId: studentFilter === "all" ? undefined : studentFilter,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteScheduleSession(id),
    onSuccess: () => {
      toast.success("Aula cancelada");
      qc.invalidateQueries({ queryKey: ["schedule"] });
      setSelected(null);
    },
    onError: () => toast.error("Falha ao cancelar aula"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Visualize os horários agendados e planeje novas aulas recorrentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por aluno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os alunos</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PlanejarAulasDialog trainerId={trainerId} />
        </div>
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
              showStudentName
              onSelectSession={setSelected}
              onSelectDay={(d) => {
                setCursor(d);
                setView("day");
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.student_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5 text-sm">
                <div>
                  {new Date(selected.starts_at).toLocaleDateString("pt-BR", { dateStyle: "full" })}
                </div>
                <div>
                  <strong>{formatHM(new Date(selected.starts_at))}</strong> ·{" "}
                  {selected.duration_minutes} min
                </div>
                <div>Status: {statusLabel(selected.status)}</div>
                {selected.notes && (
                  <p className="text-muted-foreground">{selected.notes}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => deleteMut.mutate(selected.id)}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Cancelar aula
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
