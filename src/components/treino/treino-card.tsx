import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pencil,
  Archive,
  ArchiveRestore,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useWorkoutClipboard } from "@/hooks/use-workout-clipboard";
import {
  archiveWorkout,
  unarchiveWorkout,
  deleteWorkout,
  reorderExercises,
  updateExercise,
  type Exercise,
  type Workout,
  type WorkoutList,
} from "@/lib/api/workouts";
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  deleteCheckIn,
  claimCheckIn,
} from "@/lib/api/check-ins";
import { useAuth } from "@/contexts/use-auth";
import { SortableExerciseItem, ExerciseRowContent } from "./exercise-row";
import { ExercicioFormDialog } from "./exercicio-form-dialog";
import { TreinoFormDialog } from "./treino-form-dialog";
import { ExecucaoTreinoDialog } from "./execucao-treino-dialog";

export function TreinoCard({
  treino,
  alunoId,
  trainerName,
  onWatch,
  canEdit,
  canUnarchive = false,
  canDelete = false,
}: {
  treino: Workout;
  alunoId: string;
  trainerName: string;
  onWatch: (e: Exercise) => void;
  canEdit: boolean;
  canUnarchive?: boolean;
  canDelete?: boolean;
}) {
  const qc = useQueryClient();
  const { canWrite: isStaff } = useAuth();
  const { copyWorkout } = useWorkoutClipboard();
  const canCopy = canEdit || canUnarchive;
  const [execOpen, setExecOpen] = useState(false);
  const [execFocusExerciseId, setExecFocusExerciseId] = useState<string | null>(null);

  function openExecution(exerciseId?: string) {
    setExecFocusExerciseId(exerciseId ?? null);
    setExecOpen(true);
  }

  const [localExercises, setLocalExercises] = useState(() =>
    [...treino.exercises].sort((a, b) => a.position - b.position),
  );

  // Sync with server data when exercises are added, removed, or reordered
  useEffect(() => {
    setLocalExercises([...treino.exercises].sort((a, b) => a.position - b.position));
  }, [treino.exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Check-in: independent of canEdit/canWrite — whoever is viewing as the
  // aluno (the student themselves, or a personal/admin impersonating them)
  // can start/finish a session and mark exercises, regardless of who can
  // edit the workout's structure.
  const { data: checkIn } = useQuery({
    queryKey: ["check-in", "current", alunoId, treino.id],
    queryFn: () => fetchCurrentCheckIn(alunoId, treino.id),
    enabled: treino.status === "active",
  });

  const startCheckInMut = useMutation({
    mutationFn: () => startCheckIn(alunoId, treino.id),
    onSuccess: (data) => {
      qc.setQueryData(["check-in", "current", alunoId, treino.id], data);
      openExecution();
    },
    onError: () => toast.error("Não foi possível iniciar o treino"),
  });

  const finishCheckInMut = useMutation({
    mutationFn: () => finishCheckIn(alunoId, treino.id, checkIn!.id),
    onSuccess: (data) => {
      toast.success("Treino finalizado");
      qc.setQueryData(["check-in", "current", alunoId, treino.id], data);
      qc.invalidateQueries({ queryKey: ["check-in", "history", alunoId] });
    },
    onError: () => toast.error("Não foi possível finalizar o treino"),
  });

  const deleteCheckInMut = useMutation({
    mutationFn: () => deleteCheckIn(alunoId, treino.id, checkIn!.id),
    onSuccess: () => {
      toast.success("Check-in removido");
      qc.setQueryData(["check-in", "current", alunoId, treino.id], null);
      qc.invalidateQueries({ queryKey: ["check-in", "history", alunoId] });
    },
    onError: () => toast.error("Não foi possível remover o check-in"),
  });

  // Staff-only: confirma um check-in que o aluno fez sozinho, fazendo-o
  // contar no ciclo de atendimento do personal — mirrors o botão "Confirmar
  // check-in" nas telas de Treinos Concluídos e Assiduidade dos alunos.
  const claimCheckInMut = useMutation({
    mutationFn: () => claimCheckIn(alunoId, treino.id, checkIn!.id),
    onSuccess: (data) => {
      toast.success("Check-in confirmado — agora conta no ciclo de atendimento");
      qc.setQueryData(["check-in", "current", alunoId, treino.id], data);
      qc.invalidateQueries({ queryKey: ["check-in", "history", alunoId] });
    },
    onError: () => toast.error("Não foi possível confirmar o check-in"),
  });

  const toggleExerciseMut = useMutation({
    mutationFn: ({ exerciseId, completed }: { exerciseId: string; completed: boolean }) =>
      toggleExerciseCheckIn(alunoId, treino.id, checkIn!.id, exerciseId, completed),
    onSuccess: (data) => {
      qc.setQueryData(["check-in", "current", alunoId, treino.id], data);
      if (data.status === "completed") {
        toast.success("Treino concluído!");
        qc.invalidateQueries({ queryKey: ["check-in", "history", alunoId] });
      }
    },
    onError: () => toast.error("Não foi possível atualizar o exercício"),
  });

  const updateExerciseLoadMut = useMutation({
    mutationFn: ({ exerciseId, loadKg }: { exerciseId: string; loadKg: number | null }) =>
      updateExercise(alunoId, treino.id, exerciseId, { load_kg: loadKg }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treinos", alunoId] }),
    onError: () => toast.error("Não foi possível salvar a carga"),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveWorkout(alunoId, treino.id),
    onSuccess: () => {
      toast.success("Treino arquivado");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Não foi possível arquivar o treino"),
  });

  const unarchiveMut = useMutation({
    mutationFn: () => unarchiveWorkout(alunoId, treino.id),
    onSuccess: () => {
      toast.success("Treino reativado");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Não foi possível reativar o treino"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteWorkout(alunoId, treino.id),
    onSuccess: () => {
      toast.success("Treino removido");
      // invalidateQueries alone schedules a refetch whose result doesn't
      // reliably trigger a re-render here (same issue worked around for
      // exercises via patchWorkoutExercises) — remove it from the cache
      // directly so the list updates immediately.
      qc.setQueryData<WorkoutList>(["treinos", alunoId], (old) => {
        if (!old) return old;
        return {
          active: old.active.filter((w) => w.id !== treino.id),
          archived: old.archived.filter((w) => w.id !== treino.id),
        };
      });
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Não foi possível remover o treino"),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderExercises(alunoId, treino.id, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treinos", alunoId] }),
    onError: () => {
      toast.error("Falha ao salvar a nova ordem dos exercícios");
      setLocalExercises([...treino.exercises].sort((a, b) => a.position - b.position));
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalExercises((prev) => {
      const oldIdx = prev.findIndex((e) => e.id === active.id);
      const newIdx = prev.findIndex((e) => e.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      reorderMut.mutate(reordered.map((e) => e.id));
      return reordered;
    });
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg brand-gradient text-base font-bold text-primary-foreground">
              {treino.position}
            </span>
            <CardTitle className="break-words text-lg leading-tight sm:text-xl">
              {treino.title}
            </CardTitle>
            <Badge
              variant={treino.status === "active" ? "default" : "secondary"}
              className={treino.status === "active" ? "bg-success text-success-foreground" : ""}
            >
              {treino.status === "active" ? "Ativo" : "Arquivado"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {treino.focus} · {treino.exercises.length} exercícios · Personal: {trainerName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:shrink-0 sm:justify-end">
          {canCopy && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Copiar treino"
              title="Copiar treino para colar em outro aluno"
              onClick={() => {
                copyWorkout(treino, alunoId);
                toast.success(
                  `Treino "${treino.title}" copiado (${treino.exercises.length} exercícios). Abra outro aluno para colar.`,
                );
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {canEdit && (
            <>
              <TreinoFormDialog
                mode="edit"
                alunoId={alunoId}
                treino={treino}
                trigger={
                  <Button size="icon" variant="ghost" aria-label="Editar treino">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Arquivar treino">
                    <Archive className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar este treino?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O treino será movido para a aba "Arquivados" e ficará somente leitura.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => archiveMut.mutate()}
                      disabled={archiveMut.isPending}
                    >
                      {archiveMut.isPending ? "Arquivando..." : "Arquivar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {canUnarchive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Reativar treino">
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reativar este treino?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O treino voltará para a aba "Ativos" e poderá ser editado novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => unarchiveMut.mutate()}
                    disabled={unarchiveMut.isPending}
                  >
                    {unarchiveMut.isPending ? "Reativando..." : "Reativar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Remover treino">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover este treino?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O treino e todos os seus{" "}
                    {treino.exercises.length} exercícios serão removidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                  >
                    {deleteMut.isPending ? "Removendo..." : "Remover"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {treino.status === "active" &&
          (!checkIn ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3">
              <span className="text-sm text-muted-foreground">
                Clique em <strong>Iniciar treino</strong> para marcar os exercícios concluídos.
              </span>
              <Button
                size="sm"
                onClick={() => startCheckInMut.mutate()}
                disabled={startCheckInMut.isPending}
              >
                <Play className="mr-1 h-4 w-4" /> Iniciar treino
              </Button>
            </div>
          ) : checkIn.status === "completed" ? (
            // Só um check-in por treino por dia (o backend também recusa um
            // segundo) — refazer hoje exige remover este primeiro. Uma vez
            // que o personal confirmou o check-in (performed_by "personal"),
            // só staff pode removê-lo — o aluno não vê mais o botão.
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Treino já concluído hoje ({checkIn.exercises_completed}/{checkIn.exercises_total})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {checkIn.performed_by === "aluno" && (
                  <Badge variant="outline">Feito pelo aluno</Badge>
                )}
                {isStaff && checkIn.performed_by === "aluno" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => claimCheckInMut.mutate()}
                    disabled={claimCheckInMut.isPending}
                  >
                    <BadgeCheck className="mr-1 h-4 w-4" /> Confirmar check-in
                  </Button>
                )}
                {(checkIn.performed_by === "aluno" || isStaff) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={deleteCheckInMut.isPending}>
                        <Trash2 className="mr-1 h-4 w-4" /> Remover check-in
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover este check-in?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Para refazer &quot;{treino.title}&quot;
                          hoje, é preciso remover o check-in atual primeiro.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCheckInMut.mutate()}
                          disabled={deleteCheckInMut.isPending}
                        >
                          {deleteCheckInMut.isPending ? "Removendo..." : "Remover"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3">
              <Badge variant="outline">
                {checkIn.exercises_completed}/{checkIn.exercises_total} concluídos
              </Badge>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => openExecution()}>
                  <Play className="mr-1 h-4 w-4" /> Retomar execução
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={finishCheckInMut.isPending}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Finalizar treino
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar o treino agora?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {checkIn.exercises_completed < checkIn.exercises_total
                          ? `Você concluiu ${checkIn.exercises_completed} de ${checkIn.exercises_total} exercícios. O check-in será registrado como parcial.`
                          : "Todos os exercícios foram concluídos."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => finishCheckInMut.mutate()}>
                        Finalizar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

        {localExercises.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum exercício neste treino ainda.
          </div>
        )}

        {canEdit ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localExercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {localExercises.map((ex, idx) => (
                  <SortableExerciseItem
                    key={ex.id}
                    exercise={ex}
                    idx={idx}
                    treinoId={treino.id}
                    alunoId={alunoId}
                    onWatch={onWatch}
                    canEdit
                    checkIn={checkIn}
                    onToggleExercise={(exerciseId, completed) =>
                      toggleExerciseMut.mutate({ exerciseId, completed })
                    }
                    onOpenExecution={
                      checkIn?.status === "in_progress"
                        ? (exercise) => openExecution(exercise.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-3">
            {localExercises.map((ex, idx) => (
              <ExerciseRowContent
                key={ex.id}
                exercise={ex}
                idx={idx}
                treinoId={treino.id}
                alunoId={alunoId}
                onWatch={onWatch}
                canEdit={false}
                checkIn={checkIn}
                onToggleExercise={(exerciseId, completed) =>
                  toggleExerciseMut.mutate({ exerciseId, completed })
                }
                onOpenExecution={
                  checkIn?.status === "in_progress"
                    ? (exercise) => openExecution(exercise.id)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {canEdit && (
          <div className="grid gap-2 sm:grid-cols-3">
            <ExercicioFormDialog
              mode="create"
              kind="strength"
              treinoId={treino.id}
              alunoId={alunoId}
            />
            <ExercicioFormDialog
              mode="create"
              kind="cardio"
              treinoId={treino.id}
              alunoId={alunoId}
            />
            <ExercicioFormDialog
              mode="create"
              kind="mobility"
              treinoId={treino.id}
              alunoId={alunoId}
            />
          </div>
        )}
      </CardContent>
      {checkIn && checkIn.status === "in_progress" && (
        <ExecucaoTreinoDialog
          open={execOpen}
          onOpenChange={(o) => {
            setExecOpen(o);
            if (!o) setExecFocusExerciseId(null);
          }}
          treino={treino}
          checkIn={checkIn}
          onToggleExercise={(exerciseId, completed) =>
            toggleExerciseMut.mutate({ exerciseId, completed })
          }
          onUpdateLoad={(exerciseId, loadKg) =>
            updateExerciseLoadMut.mutate({ exerciseId, loadKg })
          }
          focusExerciseId={execFocusExerciseId}
        />
      )}
    </Card>
  );
}
