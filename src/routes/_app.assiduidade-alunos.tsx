import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarCheck, Dumbbell, Loader2, RefreshCcw, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchStudents, updateStudent, type Student } from "@/lib/api/students";
import { fetchCompletedCheckIns, type WorkoutCheckIn } from "@/lib/api/check-ins";
import { useAuth } from "@/contexts/use-auth";
import {
  computeAttendanceCycle,
  ATTENDANCE_STATUS_LABEL,
  type AttendanceCycle,
  type AttendanceStatus,
} from "@/lib/attendance-cycle";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/assiduidade-alunos")({
  head: () =>
    pageHead({
      path: "/assiduidade-alunos",
      title: "Assiduidade dos alunos — Núcleo For Life",
      description:
        "Acompanhe quantos treinos cada aluno concluiu no ciclo contratado e verifique se estourou a quota.",
    }),
  component: AssiduidadeAlunosPage,
});

type StatusFilter = "all" | AttendanceStatus;

interface Row {
  student: Student;
  cycle: AttendanceCycle;
}

function AssiduidadeAlunosPage() {
  const { user, hasRole } = useAuth();
  const isPersonal = hasRole("personal");
  const personalId = isPersonal ? (user?.personal_id ?? undefined) : undefined;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["alunos", personalId ?? "all"],
    queryFn: () =>
      fetchStudents(
        personalId ? { trainerId: personalId, status: "active" } : { status: "active" },
      ),
  });
  const { data: checkIns = [], isLoading: loadingCheckIns } = useQuery({
    queryKey: ["completed-check-ins"],
    queryFn: fetchCompletedCheckIns,
  });

  const rows = useMemo<Row[]>(() => {
    const byStudent = new Map<string, WorkoutCheckIn[]>();
    for (const c of checkIns) {
      const list = byStudent.get(c.student_id) ?? [];
      list.push(c);
      byStudent.set(c.student_id, list);
    }
    return students.map((student) => ({
      student,
      cycle: computeAttendanceCycle(
        byStudent.get(student.id) ?? [],
        student.contracted_workouts_per_cycle ?? null,
        student.cycle_started_at ?? null,
      ),
    }));
  }, [students, checkIns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (q ? r.student.name.toLowerCase().includes(q) : true))
      .filter((r) => (statusFilter === "all" ? true : r.cycle.status === statusFilter))
      .sort((a, b) => {
        // Ordena por: estourou → near_limit → on_track → no_contract, e depois por nome.
        const rank: Record<AttendanceStatus, number> = {
          exceeded: 0,
          near_limit: 1,
          on_track: 2,
          no_contract: 3,
        };
        const d = rank[a.cycle.status] - rank[b.cycle.status];
        return d !== 0 ? d : a.student.name.localeCompare(b.student.name, "pt-BR");
      });
  }, [rows, query, statusFilter]);

  const loading = loadingStudents || loadingCheckIns;
  const selected = selectedId ? (rows.find((r) => r.student.id === selectedId) ?? null) : null;

  const exceededCount = rows.filter((r) => r.cycle.status === "exceeded").length;
  const nearLimitCount = rows.filter((r) => r.cycle.status === "near_limit").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Assiduidade dos alunos</h1>
          <p className="text-sm text-muted-foreground">
            Quantos treinos cada aluno concluiu no ciclo contratado.
          </p>
        </div>
        {(exceededCount > 0 || nearLimitCount > 0) && (
          <div className="flex gap-2 text-xs">
            {exceededCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {exceededCount} estourou
              </Badge>
            )}
            {nearLimitCount > 0 && (
              <Badge className="bg-warning text-warning-foreground">
                {nearLimitCount} próximo do limite
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar aluno..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="on_track">Em dia</SelectItem>
            <SelectItem value="near_limit">Próximo do limite</SelectItem>
            <SelectItem value="exceeded">Estourou</SelectItem>
            <SelectItem value="no_contract">Sem contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum aluno encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="w-[280px]">Progresso do ciclo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Último treino</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(({ student, cycle }) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedId(student.id)}
                    >
                      <TableCell>
                        <div className="font-medium text-foreground">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.trainer_name}</div>
                      </TableCell>
                      <TableCell>
                        <CycleProgress cycle={cycle} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={cycle.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {cycle.lastCompletedAt
                          ? new Date(cycle.lastCompletedAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(student.id);
                          }}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CycleDetailsDialog row={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CycleProgress({ cycle }: { cycle: AttendanceCycle }) {
  if (cycle.contracted == null) {
    return <span className="text-xs text-muted-foreground">Sem contrato definido</span>;
  }
  const pct = Math.min(cycle.percentage, 100);
  const barClass =
    cycle.status === "exceeded"
      ? "[&>div]:bg-destructive"
      : cycle.status === "near_limit"
        ? "[&>div]:bg-warning"
        : "[&>div]:bg-success";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {cycle.completedInCycle} / {cycle.contracted}
        </span>
        <span
          className={cn(
            "font-medium",
            cycle.status === "exceeded" && "text-destructive",
            cycle.status === "near_limit" && "text-warning",
          )}
        >
          {cycle.percentage}%
        </span>
      </div>
      <Progress value={pct} className={cn("h-2", barClass)} />
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cls =
    status === "exceeded"
      ? "bg-destructive text-destructive-foreground"
      : status === "near_limit"
        ? "bg-warning text-warning-foreground"
        : status === "on_track"
          ? "bg-success text-success-foreground"
          : "bg-muted text-muted-foreground";
  return <Badge className={cls}>{ATTENDANCE_STATUS_LABEL[status]}</Badge>;
}

function CycleDetailsDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const renewMut = useMutation({
    mutationFn: (studentId: string) =>
      updateStudent(studentId, { cycle_started_at: new Date().toISOString() }),
    onSuccess: () => {
      toast.success("Ciclo renovado. A contagem recomeça agora.");
      qc.invalidateQueries({ queryKey: ["alunos"] });
      onClose();
    },
    onError: () => toast.error("Não foi possível renovar o ciclo."),
  });

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      {row && (
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              {row.student.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <CycleProgress cycle={row.cycle} />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Ciclo iniciado em{" "}
                  {row.student.cycle_started_at
                    ? new Date(row.student.cycle_started_at).toLocaleDateString("pt-BR")
                    : "—"}
                </span>
                <StatusBadge status={row.cycle.status} />
              </div>
            </div>

            {row.cycle.status === "exceeded" && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  O aluno já concluiu mais treinos do que o contrato prevê. Considere renovar o
                  ciclo ou revisar o plano contratado.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Treinos concluídos no ciclo ({row.cycle.checkInsInCycle.length})
              </h3>
              {row.cycle.checkInsInCycle.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum treino concluído neste ciclo.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {row.cycle.checkInsInCycle.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Dumbbell className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{c.workout_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.completed_at
                            ? new Date(c.completed_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}{" "}
                          · {c.exercises_completed}/{c.exercises_total} exercícios
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {row.student.contracted_workouts_per_cycle != null && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => renewMut.mutate(row.student.id)}
                  disabled={renewMut.isPending}
                >
                  {renewMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="mr-2 h-4 w-4" />
                  )}
                  Renovar ciclo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
