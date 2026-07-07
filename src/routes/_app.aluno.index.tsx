import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  archiveWorkout,
  unarchiveWorkout,
  createExercise,
  updateExercise,
  deleteExercise,
  reorderExercises,
  reorderWorkouts,
  type Exercise,
  type Workout,
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
            <DialogDescription>
              {videoEx ? describeExercise(videoEx) : ""}
            </DialogDescription>
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
}: {
  treino: Workout;
  alunoId: string;
  onWatch: (e: Exercise) => void;
  canEdit: boolean;
  canUnarchive?: boolean;
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
            <ExercicioFormDialog mode="create" kind="strength" treinoId={treino.id} alunoId={alunoId} />
            <ExercicioFormDialog mode="create" kind="cardio" treinoId={treino.id} alunoId={alunoId} />
            <ExercicioFormDialog mode="create" kind="mobility" treinoId={treino.id} alunoId={alunoId} />
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

function ExercicioFormDialog({
  mode,
  treinoId,
  alunoId,
  exercicio,
  trigger,
}: {
  mode: "create" | "edit";
  treinoId: string;
  alunoId: string;
  exercicio?: Exercise;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const emptyForm = {
    name: "",
    muscle_group: "",
    sets: 3,
    reps: "10-12",
    load_kg: undefined as number | undefined,
    rest_seconds: 60,
    video_url: "",
    notes: "",
  };
  const formFromEx = (ex: Exercise) => ({
    name: ex.name,
    muscle_group: ex.muscle_group,
    sets: ex.sets,
    reps: ex.reps,
    load_kg: ex.load_kg ?? undefined,
    rest_seconds: ex.rest_seconds,
    video_url: ex.video_url,
    notes: ex.notes ?? "",
  });
  const [form, setForm] = useState(exercicio ? formFromEx(exercicio) : emptyForm);

  const mut = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createExercise(alunoId, treinoId, {
            ...form,
            load_kg: form.load_kg,
            notes: form.notes || undefined,
          })
        : updateExercise(alunoId, treinoId, exercicio!.id, {
            ...form,
            load_kg: form.load_kg,
            notes: form.notes || undefined,
          }),
    onSuccess: () => {
      toast.success(mode === "create" ? "Exercício adicionado" : "Exercício atualizado");
      qc.invalidateQueries({ queryKey: ["treinos"] });
      setOpen(false);
      if (mode === "create") setForm(emptyForm);
    },
    onError: () =>
      toast.error(
        mode === "create" ? "Falha ao adicionar exercício" : "Falha ao atualizar exercício",
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && mode === "edit" && exercicio) setForm(formFromEx(exercicio));
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="w-full border-dashed">
            <Plus className="mr-1 h-4 w-4" /> Adicionar exercício / série
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-w-lg max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Adicionar exercício" : "Editar exercício"}
          </DialogTitle>
          <DialogDescription>
            Cadastre o exercício com séries, repetições, carga e descanso.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2">
              <Input
                placeholder="Ex.: Supino reto com barra"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
              />
            </Field>
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
                value={form.sets}
                onChange={(e) =>
                  setForm({ ...form, sets: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </Field>
            <Field label="Repetições">
              <Input
                placeholder="Ex.: 10 ou 8-12 ou 45s"
                value={form.reps}
                onChange={(e) => setForm({ ...form, reps: e.target.value })}
                maxLength={20}
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
                value={form.rest_seconds}
                onChange={(e) =>
                  setForm({ ...form, rest_seconds: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </Field>
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
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending ||
              videoUploading ||
              !form.name.trim() ||
              !form.muscle_group.trim() ||
              !form.reps.trim()
            }
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
      qc.invalidateQueries({ queryKey: ["treinos"] });
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
