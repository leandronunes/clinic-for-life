import {
  Play,
  Dumbbell,
  Clock,
  Pencil,
  GripVertical,
  HeartPulse,
  Waves,
  Timer,
  Route as RouteIcon,
  Activity,
  CheckCircle2,
} from "lucide-react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CollapsibleNote } from "@/components/CollapsibleNote";
import type { Exercise } from "@/lib/api/workouts";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import { KIND_META, getKind, formatDuration } from "@/lib/exercise-kind";
import { ExercicioFormDialog, DeleteExercicioButton } from "./exercicio-form-dialog";

interface ExerciseRowProps {
  exercise: Exercise;
  idx: number;
  treinoId: string;
  alunoId: string;
  onWatch: (e: Exercise) => void;
  canEdit: boolean;
  checkIn?: WorkoutCheckIn | null;
  onToggleExercise?: (exerciseId: string, completed: boolean) => void;
  /** Only passed once a check-in is in progress — opens the execution dialog
   * focused on this exercise instead of wherever it would otherwise resume. */
  onOpenExecution?: (exercise: Exercise) => void;
}

export function SortableExerciseItem(props: ExerciseRowProps) {
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

export function ExerciseRowContent({
  exercise,
  idx,
  treinoId,
  alunoId,
  onWatch,
  canEdit,
  checkIn,
  onToggleExercise,
  onOpenExecution,
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
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        meta.rowClass,
        onOpenExecution && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
      )}
      role={onOpenExecution ? "button" : undefined}
      tabIndex={onOpenExecution ? 0 : undefined}
      aria-label={onOpenExecution ? `Abrir execução de "${exercise.name}"` : undefined}
      onClick={onOpenExecution ? () => onOpenExecution(exercise) : undefined}
      onKeyDown={
        onOpenExecution
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onOpenExecution(exercise);
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {onToggleExercise ? (
            <span onClick={(e) => e.stopPropagation()}>
              <ExerciseToggleIcon
                exercise={exercise}
                checkIn={checkIn}
                onToggle={onToggleExercise}
              />
            </span>
          ) : (
            <div
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold",
                meta.badgeClass,
              )}
              aria-label={meta.label}
            >
              <KindIcon className="h-4 w-4" />
            </div>
          )}
          {dragHandleListeners && (
            <button
              type="button"
              className="flex shrink-0 cursor-grab items-center self-center p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Reordenar exercício"
              onClick={(e) => e.stopPropagation()}
              {...dragHandleAttributes}
              {...dragHandleListeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
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
                      Zona {exercise.hr_zone}
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
        <div
          className="flex flex-wrap items-center gap-2 self-start sm:self-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
      {exercise.notes && (
        <div onClick={(e) => e.stopPropagation()}>
          <CollapsibleNote notes={exercise.notes} variant="plain" />
        </div>
      )}
    </div>
  );
}

function ExerciseToggleIcon({
  exercise,
  checkIn,
  onToggle,
}: {
  exercise: Exercise;
  checkIn?: WorkoutCheckIn | null;
  onToggle: (exerciseId: string, completed: boolean) => void;
}) {
  const kind = getKind(exercise);
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  const completed = checkIn?.completed_exercise_ids.includes(exercise.id) ?? false;
  const disabled = !checkIn || checkIn.status === "completed";

  let tooltip: string | null = null;
  if (!checkIn) {
    tooltip = "Inicie o treino para marcar este exercício como concluído.";
  } else if (checkIn.status === "completed") {
    tooltip = "Treino já finalizado.";
  }

  const label = completed
    ? `Desmarcar "${exercise.name}"`
    : `Marcar "${exercise.name}" como concluído`;

  const className = cn(
    "grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    completed ? "bg-success/20 text-success ring-2 ring-success" : meta.badgeClass,
    !disabled &&
      !completed &&
      "cursor-pointer hover:bg-primary/10 hover:ring-2 hover:ring-primary/40",
    disabled && "cursor-not-allowed opacity-60",
  );

  const icon = completed ? (
    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
  ) : (
    <KindIcon className="h-4 w-4" aria-hidden="true" />
  );

  const content = (
    <button
      type="button"
      className={className}
      onClick={() => onToggle(exercise.id, !completed)}
      aria-pressed={completed ? "true" : "false"}
      aria-label={label}
      disabled={disabled}
    >
      {icon}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", disabled && "cursor-not-allowed")}>{content}</span>
      </TooltipTrigger>
      {tooltip && (
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
