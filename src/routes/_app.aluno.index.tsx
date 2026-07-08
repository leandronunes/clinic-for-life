import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Clock,
  Dumbbell,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Info,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  HeartPulse,
  Waves,
  Timer,
  Route as RouteIcon,
  Activity,
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
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/contexts/use-auth";
import {
  fetchWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  archiveWorkout,
  unarchiveWorkout,
  createExercise,
  updateExercise,
  deleteExercise,
  reorderExercises,
  reorderWorkouts,
  type Exercise,
  type Workout,
  type WorkoutList,
  type ExerciseKind,
  type DistanceUnit,
  type HrZone,
  type CreateExercisePayload,
} from "@/lib/api/workouts";
import { ExercicioVideoInput } from "@/components/ExercicioVideoInput";
import { isUploadedVideo } from "@/lib/video-url";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/")({
  component: MeuTreinoPage,
});

function MeuTreinoPage() {
  const { user, effectiveAlunoId, canWrite } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["treinos", alunoId],
    queryFn: () => fetchWorkouts(alunoId),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const [videoEx, setVideoEx] = useState<Exercise | null>(null);
  const qc = useQueryClient();

  const serverLista = useMemo(
    () =>
      [...(view === "ativos" ? (data?.active ?? []) : (data?.archived ?? []))].sort(
        (a, b) => a.position - b.position,
      ),
    [view, data],
  );
  const [localLista, setLocalLista] = useState<Workout[]>([]);

  useEffect(() => {
    setLocalLista(serverLista);
  }, [serverLista]);

  const treinoAtual = localLista.find((t) => t.id === selectedId) ?? localLista[0];

  const workoutSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderWorkoutsMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderWorkouts(alunoId, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treinos", alunoId] }),
    onError: () => {
      toast.error("Falha ao salvar a nova ordem dos treinos");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
  });

  function handleWorkoutDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalLista((prev) => {
      const oldIdx = prev.findIndex((t) => t.id === active.id);
      const newIdx = prev.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      reorderWorkoutsMut.mutate(reordered.map((t) => t.id));
      return reordered;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Meu Treino</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {user?.name?.split(" ")[0]} — seu plano de treinos atualizado pelo seu Personal.
          </p>
        </div>
        {canWrite && view === "ativos" && (
          <NovoTreinoDialog
            alunoId={alunoId}
            personalNome={user?.role === "personal" ? user.name : undefined}
            onCreated={(t) => setSelectedId(t.id)}
          />
        )}
      </div>

      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as "ativos" | "arquivados");
          setSelectedId(null);
        }}
      >
        <TabsList>
          <TabsTrigger value="ativos" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Ativos
          </TabsTrigger>
          <TabsTrigger value="arquivados" className="gap-2">
            <Archive className="h-4 w-4" /> Arquivados
          </TabsTrigger>
        </TabsList>

        <TabsContent value={view} className="mt-4 space-y-4">
          {view === "arquivados" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Treinos arquivados são somente leitura — mantidos como histórico.</span>
            </div>
          )}

          {isLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          )}

          {!isLoading && localLista.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Nenhum treino {view === "ativos" ? "ativo" : "arquivado"}.
              </CardContent>
            </Card>
          )}

          {!isLoading && localLista.length > 0 && (
            <>
              {canWrite ? (
                <DndContext
                  sensors={workoutSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleWorkoutDragEnd}
                >
                  <SortableContext
                    items={localLista.map((t) => t.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-2">
                      {localLista.map((t) => (
                        <SortableWorkoutButton
                          key={t.id}
                          treino={t}
                          active={treinoAtual?.id === t.id}
                          onClick={() => setSelectedId(t.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {localLista.map((t) => {
                    const isActive = treinoAtual?.id === t.id;
                    return (
                      <Button
                        key={t.id}
                        variant={isActive ? "default" : "outline"}
                        onClick={() => setSelectedId(t.id)}
                        className={isActive ? "brand-gradient text-primary-foreground" : ""}
                      >
                        Treino {t.position}
                      </Button>
                    );
                  })}
                </div>
              )}

              {treinoAtual && (
                <TreinoCard
                  treino={treinoAtual}
                  alunoId={alunoId}
                  onWatch={setVideoEx}
                  canEdit={canWrite && treinoAtual.status === "active"}
                  canUnarchive={canWrite && treinoAtual.status === "archived"}
                  canDelete={canWrite}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!videoEx} onOpenChange={(o) => !o && setVideoEx(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{videoEx?.name}</DialogTitle>
            <DialogDescription>{videoEx ? describeExercise(videoEx) : ""}</DialogDescription>
          </DialogHeader>
          {videoEx && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {isUploadedVideo(videoEx.video_url) ? (
                <video src={videoEx.video_url} controls playsInline className="h-full w-full" />
              ) : (
                <iframe
                  src={videoEx.video_url}
                  title={videoEx.name}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}
          {videoEx?.notes && (
            <p className="rounded-md bg-muted p-3 text-sm">
              <strong>Observação do Personal:</strong> {videoEx.notes}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableWorkoutButton({
  treino,
  active,
  onClick,
}: {
  treino: Workout;
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: treino.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, display: "inline-flex" }}
      className={cn(isDragging && "opacity-50")}
    >
      <Button
        variant={active ? "default" : "outline"}
        onClick={onClick}
        className={cn(
          "touch-none cursor-grab active:cursor-grabbing",
          active && "brand-gradient text-primary-foreground",
        )}
        {...attributes}
        {...listeners}
      >
        Treino {treino.position}
      </Button>
    </div>
  );
}

export function TreinoCard({
  treino,
  alunoId,
  onWatch,
  canEdit,
  canUnarchive = false,
  canDelete = false,
}: {
  treino: Workout;
  alunoId: string;
  onWatch: (e: Exercise) => void;
  canEdit: boolean;
  canUnarchive?: boolean;
  canDelete?: boolean;
}) {
  const qc = useQueryClient();

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
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-base font-bold text-primary-foreground">
              {treino.position}
            </span>
            {treino.title}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {treino.focus} · {treino.exercises.length} exercícios · Personal: {treino.trainer_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={treino.status === "active" ? "default" : "secondary"}
            className={treino.status === "active" ? "bg-success text-success-foreground" : ""}
          >
            {treino.status === "active" ? "Ativo" : "Arquivado"}
          </Badge>
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
    </Card>
  );
}

interface ExerciseRowProps {
  exercise: Exercise;
  idx: number;
  treinoId: string;
  alunoId: string;
  onWatch: (e: Exercise) => void;
  canEdit: boolean;
}

function SortableExerciseItem(props: ExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.exercise.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <ExerciseRowContent
        {...props}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
      />
    </div>
  );
}

function ExerciseRowContent({
  exercise,
  idx,
  treinoId,
  alunoId,
  onWatch,
  canEdit,
  dragHandleListeners,
  dragHandleAttributes,
}: ExerciseRowProps & {
  dragHandleListeners?: DraggableSyntheticListeners;
  dragHandleAttributes?: DraggableAttributes;
}) {
  const kind = getKind(exercise);
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
        meta.rowClass,
      )}
    >
      <div className="flex items-start gap-3">
        {dragHandleListeners && (
          <button
            type="button"
            className="flex shrink-0 cursor-grab items-center self-center p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Reordenar exercício"
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold",
            meta.badgeClass,
          )}
          aria-label={meta.label}
        >
          <KindIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{exercise.name}</span>
            <Badge variant="outline" className={cn("text-[10px]", meta.chipClass)}>
              {meta.label}
            </Badge>
            {kind === "strength" && exercise.muscle_group && (
              <Badge variant="outline" className="text-[10px]">
                {exercise.muscle_group}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {kind === "strength" && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {exercise.sets ?? 0}×{exercise.reps ?? "-"}
                  {exercise.load_kg ? ` · ${exercise.load_kg}kg` : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {exercise.rest_seconds ?? 0}s descanso
                </span>
              </>
            )}
            {kind === "mobility" && (
              <span className="inline-flex items-center gap-1">
                <Waves className="h-3 w-3" />
                {exercise.sets ?? 0}×{exercise.reps ?? "-"}
              </span>
            )}
            {kind === "cardio" && (
              <>
                {exercise.duration_seconds ? (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatDuration(exercise.duration_seconds)}
                  </span>
                ) : null}
                {exercise.distance_value ? (
                  <span className="inline-flex items-center gap-1">
                    <RouteIcon className="h-3 w-3" />
                    {exercise.distance_value} {exercise.distance_unit ?? "m"}
                  </span>
                ) : null}
                {exercise.hr_zone ? (
                  <span className="inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Zona {exercise.hr_zone} ({HR_ZONE_RANGE[exercise.hr_zone]})
                  </span>
                ) : null}
                {exercise.heart_rate_bpm ? (
                  <span className="inline-flex items-center gap-1">
                    <HeartPulse className="h-3 w-3" />
                    {exercise.heart_rate_bpm} bpm
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        {exercise.video_url && (
          <Button size="sm" variant="outline" onClick={() => onWatch(exercise)}>
            <Play className="mr-1 h-4 w-4" /> Ver execução
          </Button>
        )}
        {canEdit && (
          <>
            <ExercicioFormDialog
              mode="edit"
              kind={kind}
              treinoId={treinoId}
              alunoId={alunoId}
              exercicio={exercise}
              trigger={
                <Button size="icon" variant="ghost" aria-label="Editar exercício">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <DeleteExercicioButton treinoId={treinoId} alunoId={alunoId} exercicio={exercise} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Dialogs (admin/personal) ---------------- */

function NovoTreinoDialog({
  alunoId,
  personalNome,
  onCreated,
}: {
  alunoId: string;
  personalNome?: string;
  onCreated?: (t: Workout) => void;
}) {
  return (
    <TreinoFormDialog
      mode="create"
      alunoId={alunoId}
      personalNome={personalNome}
      onCreated={onCreated}
      trigger={
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo treino
        </Button>
      }
    />
  );
}

function TreinoFormDialog({
  mode,
  alunoId,
  personalNome,
  treino,
  trigger,
  onCreated,
}: {
  mode: "create" | "edit";
  alunoId: string;
  personalNome?: string;
  treino?: Workout;
  trigger?: React.ReactNode;
  onCreated?: (t: Workout) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; focus: string }>({
    title: treino?.title ?? "",
    focus: treino?.focus ?? "",
  });

  const mut = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createWorkout(alunoId, {
            title: form.title,
            focus: form.focus,
            trainer_name: personalNome,
          })
        : updateWorkout(alunoId, treino!.id, { title: form.title, focus: form.focus }),
    onSuccess: (novo) => {
      toast.success(mode === "create" ? `Treino ${novo.position} cadastrado` : "Treino atualizado");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      if (mode === "create") {
        setForm({ title: "", focus: "" });
        onCreated?.(novo);
      }
    },
    onError: () =>
      toast.error(
        mode === "create"
          ? "Não foi possível cadastrar o treino"
          : "Não foi possível atualizar o treino",
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && mode === "edit" && treino) setForm({ title: treino.title, focus: treino.focus });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Cadastrar novo treino" : "Editar treino"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "A posição é atribuída automaticamente conforme a ordem dos treinos ativos."
              : "Atualize o título e o foco deste treino."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input
              placeholder="Ex.: Peito, Ombro e Tríceps"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
            />
          </Field>
          <Field label="Foco" className="sm:col-span-2">
            <Input
              placeholder="Ex.: Empurrar (Push)"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              maxLength={80}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title.trim() || !form.focus.trim()}
          >
            {mut.isPending
              ? "Salvando..."
              : mode === "create"
                ? "Criar treino"
                : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExercicioFormState {
  name: string;
  muscle_group: string;
  sets: number | undefined;
  reps: string;
  load_kg: number | undefined;
  rest_seconds: number | undefined;
  duration_seconds: number;
  distance_value: number | undefined;
  distance_unit: DistanceUnit;
  hr_zone: HrZone | undefined;
  heart_rate_bpm: number | undefined;
  video_url: string;
  notes: string;
}

const EMPTY_FORM_BY_KIND: Record<ExerciseKind, ExercicioFormState> = {
  strength: {
    name: "",
    muscle_group: "",
    sets: 3,
    reps: "10-12",
    load_kg: undefined,
    rest_seconds: 60,
    duration_seconds: 0,
    distance_value: undefined,
    distance_unit: "m",
    hr_zone: undefined,
    heart_rate_bpm: undefined,
    video_url: "",
    notes: "",
  },
  cardio: {
    name: "",
    muscle_group: "",
    sets: 0,
    reps: "",
    load_kg: undefined,
    rest_seconds: 0,
    duration_seconds: 600,
    distance_value: undefined,
    distance_unit: "km",
    hr_zone: 2,
    heart_rate_bpm: undefined,
    video_url: "",
    notes: "",
  },
  mobility: {
    name: "",
    muscle_group: "",
    sets: 2,
    reps: "10",
    load_kg: undefined,
    rest_seconds: 0,
    duration_seconds: 0,
    distance_value: undefined,
    distance_unit: "m",
    hr_zone: undefined,
    heart_rate_bpm: undefined,
    video_url: "",
    notes: "",
  },
};

function formFromExercise(ex: Exercise, kind: ExerciseKind): ExercicioFormState {
  const base = EMPTY_FORM_BY_KIND[kind];
  return {
    name: ex.name,
    muscle_group: ex.muscle_group ?? base.muscle_group,
    sets: ex.sets ?? base.sets,
    reps: ex.reps ?? base.reps,
    load_kg: ex.load_kg ?? undefined,
    rest_seconds: ex.rest_seconds ?? base.rest_seconds,
    duration_seconds: ex.duration_seconds ?? base.duration_seconds,
    distance_value: ex.distance_value ?? undefined,
    distance_unit: ex.distance_unit ?? base.distance_unit,
    hr_zone: ex.hr_zone ?? base.hr_zone,
    heart_rate_bpm: ex.heart_rate_bpm ?? undefined,
    video_url: ex.video_url,
    notes: ex.notes ?? "",
  };
}

function buildPayload(form: ExercicioFormState, kind: ExerciseKind): CreateExercisePayload {
  const notes = form.notes.trim() ? form.notes : undefined;
  const video_url = form.video_url || undefined;
  if (kind === "strength") {
    return {
      kind,
      name: form.name,
      muscle_group: form.muscle_group,
      sets: form.sets,
      reps: form.reps,
      load_kg: form.load_kg,
      rest_seconds: form.rest_seconds,
      video_url,
      notes,
    };
  }
  if (kind === "mobility") {
    return {
      kind,
      name: form.name,
      sets: form.sets,
      reps: form.reps,
      video_url,
      notes,
    };
  }
  return {
    kind,
    name: form.name,
    duration_seconds: form.duration_seconds || undefined,
    distance_value: form.distance_value,
    distance_unit: form.distance_value ? form.distance_unit : undefined,
    hr_zone: form.hr_zone,
    heart_rate_bpm: form.heart_rate_bpm,
    video_url,
    notes,
  };
}

/**
 * Patches an exercise change directly into the ["treinos", alunoId] cache
 * entry so the list reflects it immediately. `invalidateQueries` alone also
 * schedules a refetch, but its background result doesn't reliably trigger a
 * re-render on this page — writing the known result straight into the cache
 * sidesteps that.
 */
function patchWorkoutExercises(
  qc: QueryClient,
  alunoId: string,
  treinoId: string,
  updater: (exercises: Exercise[]) => Exercise[],
) {
  qc.setQueryData<WorkoutList>(["treinos", alunoId], (old) => {
    if (!old) return old;
    const patch = (list: Workout[]) =>
      list.map((w) => (w.id === treinoId ? { ...w, exercises: updater(w.exercises) } : w));
    return { active: patch(old.active), archived: patch(old.archived) };
  });
}

function ExercicioFormDialog({
  mode,
  kind,
  treinoId,
  alunoId,
  exercicio,
  trigger,
}: {
  mode: "create" | "edit";
  kind: ExerciseKind;
  treinoId: string;
  alunoId: string;
  exercicio?: Exercise;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const meta = KIND_META[kind];
  const [form, setForm] = useState<ExercicioFormState>(
    exercicio ? formFromExercise(exercicio, kind) : EMPTY_FORM_BY_KIND[kind],
  );
  // Guards against a double-submit firing two mutations before `mut.isPending`
  // (a React state value) re-renders the disabled button — a plain ref check
  // is synchronous and immune to that race.
  const submittingRef = useRef(false);

  const mut = useMutation({
    mutationFn: () => {
      const payload = buildPayload(form, kind);
      return mode === "create"
        ? createExercise(alunoId, treinoId, payload)
        : updateExercise(alunoId, treinoId, exercicio!.id, payload);
    },
    onSuccess: (savedExercise) => {
      toast.success(
        mode === "create" ? `${meta.label} adicionado(a)` : `${meta.label} atualizado(a)`,
      );
      patchWorkoutExercises(qc, alunoId, treinoId, (exercises) =>
        mode === "create"
          ? [...exercises, savedExercise]
          : exercises.map((e) => (e.id === savedExercise.id ? savedExercise : e)),
      );
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      if (mode === "create") setForm(EMPTY_FORM_BY_KIND[kind]);
    },
    onError: () =>
      toast.error(
        mode === "create"
          ? `Falha ao adicionar ${meta.label.toLowerCase()}`
          : `Falha ao atualizar ${meta.label.toLowerCase()}`,
      ),
  });

  const canSubmit = (() => {
    if (!form.name.trim()) return false;
    if (kind === "strength") return !!form.muscle_group.trim() && !!form.reps.trim();
    if (kind === "mobility") return !!form.reps.trim() && (form.sets ?? 0) > 0;
    // cardio — precisa ao menos tempo OU distância
    return form.duration_seconds > 0 || (form.distance_value ?? 0) > 0;
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && mode === "edit" && exercicio) setForm(formFromExercise(exercicio, kind));
        if (o && mode === "create") setForm(EMPTY_FORM_BY_KIND[kind]);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full border-dashed", meta.buttonClass)}
          >
            <Plus className="mr-1 h-4 w-4" /> {meta.addLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-w-lg max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? `Adicionar ${meta.label.toLowerCase()}`
              : `Editar ${meta.label.toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>{meta.formHint}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2">
              <Input
                placeholder={meta.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
              />
            </Field>

            {kind === "strength" && (
              <>
                <Field label="Grupo muscular">
                  <Input
                    placeholder="Ex.: Peito"
                    value={form.muscle_group}
                    onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
                    maxLength={40}
                  />
                </Field>
                <Field label="Séries">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.sets ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sets:
                          e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
                <Field label="Repetições" className="sm:col-span-2">
                  <Input
                    placeholder="Ex.: 10 ou 8-12 ou 45s"
                    value={form.reps}
                    onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  />
                </Field>
                <Field label="Carga (kg)">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.load_kg ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        load_kg: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Descanso (s)">
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={form.rest_seconds ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rest_seconds:
                          e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
              </>
            )}

            {kind === "mobility" && (
              <>
                <Field label="Séries">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.sets ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sets:
                          e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
                <Field label="Repetições" className="sm:col-span-2">
                  <Input
                    placeholder="Ex.: 10 ou 30s"
                    value={form.reps}
                    onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  />
                </Field>
              </>
            )}

            {kind === "cardio" && (
              <>
                <Field label="Tempo (mm:ss)">
                  <Input
                    placeholder="Ex.: 20:00"
                    value={secondsToMMSS(form.duration_seconds)}
                    onChange={(e) =>
                      setForm({ ...form, duration_seconds: mmssToSeconds(e.target.value) })
                    }
                    maxLength={8}
                  />
                </Field>
                <Field label="Distância">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="Ex.: 5"
                      value={form.distance_value ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          distance_value:
                            e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Select
                      value={form.distance_unit}
                      onValueChange={(v) => setForm({ ...form, distance_unit: v as DistanceUnit })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">metros</SelectItem>
                        <SelectItem value="km">km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field label="Zona / Intensidade" className="sm:col-span-2">
                  <Select
                    value={form.hr_zone ? String(form.hr_zone) : ""}
                    onValueChange={(v) => setForm({ ...form, hr_zone: Number(v) as HrZone })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Zona 1 — &lt; 133 bpm</SelectItem>
                      <SelectItem value="2">Zona 2 — 134–146 bpm</SelectItem>
                      <SelectItem value="3">Zona 3 — 147–159 bpm</SelectItem>
                      <SelectItem value="4">Zona 4 — 160–172 bpm</SelectItem>
                      <SelectItem value="5">Zona 5 — 173+ bpm</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Frequência cardíaca (bpm)" className="sm:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    max={230}
                    placeholder="Ex.: 145"
                    value={form.heart_rate_bpm ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        heart_rate_bpm: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </>
            )}

            <Field label="Vídeo de demonstração" className="sm:col-span-2">
              <ExercicioVideoInput
                studentId={alunoId}
                value={form.video_url}
                onChange={(url) => setForm({ ...form, video_url: url })}
                onUploadingChange={setVideoUploading}
              />
            </Field>
            <Field label="Observação" className="sm:col-span-2">
              <Textarea
                placeholder="Dica de execução (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={300}
                rows={2}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (submittingRef.current) return;
              submittingRef.current = true;
              mut.mutate(undefined, {
                onSettled: () => {
                  submittingRef.current = false;
                },
              });
            }}
            disabled={mut.isPending || videoUploading || !canSubmit}
          >
            {videoUploading
              ? "Aguardando vídeo..."
              : mut.isPending
                ? "Salvando..."
                : mode === "create"
                  ? "Adicionar"
                  : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Helpers de tipo de exercício ---------------- */

function getKind(ex: Exercise): ExerciseKind {
  return ex.kind ?? "strength";
}

interface KindMeta {
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

const KIND_META: Record<ExerciseKind, KindMeta> = {
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

const HR_ZONE_RANGE: Record<HrZone, string> = {
  1: "< 133 bpm",
  2: "134–146 bpm",
  3: "147–159 bpm",
  4: "160–172 bpm",
  5: "173+ bpm",
};

function secondsToMMSS(total: number): string {
  if (!total || total <= 0) return "";
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function mmssToSeconds(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(":").map((p) => Number(p) || 0);
  if (parts.length === 1) return Math.max(0, parts[0]);
  const [m, s] = parts;
  return Math.max(0, m * 60 + s);
}

function formatDuration(total: number): string {
  const mmss = secondsToMMSS(total);
  return mmss || `${total}s`;
}

function describeExercise(ex: Exercise): string {
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

function DeleteExercicioButton({
  treinoId,
  alunoId,
  exercicio,
}: {
  treinoId: string;
  alunoId: string;
  exercicio: Exercise;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deleteExercise(alunoId, treinoId, exercicio.id),
    onSuccess: () => {
      toast.success("Exercício removido");
      patchWorkoutExercises(qc, alunoId, treinoId, (exercises) =>
        exercises.filter((e) => e.id !== exercicio.id),
      );
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Falha ao remover exercício"),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Remover exercício">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover "{exercicio.name}"?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
