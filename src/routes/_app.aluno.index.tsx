import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Archive, Info } from "lucide-react";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import { fetchStudent } from "@/lib/api/students";
import { fetchWorkouts, reorderWorkouts, type Exercise, type Workout } from "@/lib/api/workouts";
import { toast } from "sonner";
import { TreinoCard } from "@/components/treino/treino-card";
import { ColarTreinoButton } from "@/components/treino/colar-treino-button";
import { NovoTreinoDialog } from "@/components/treino/treino-form-dialog";
import { ExerciseVideoDialog } from "@/components/treino/exercise-video-dialog";

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
  const { data: student } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => fetchStudent(alunoId),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const [videoEx, setVideoEx] = useState<Exercise | null>(null);
  const qc = useQueryClient();

  // Deep link from a "novo treino criado" push notification (?workout=<id>).
  useEffect(() => {
    const workoutId = new URLSearchParams(window.location.search).get("workout");
    if (workoutId) setSelectedId(workoutId);
  }, []);

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
          <div className="flex flex-wrap items-center gap-2">
            <ColarTreinoButton alunoId={alunoId} onPasted={(t) => setSelectedId(t.id)} />
            <NovoTreinoDialog alunoId={alunoId} onCreated={(t) => setSelectedId(t.id)} />
          </div>
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
                        className={cn(
                          "max-w-[70vw] sm:max-w-[240px]",
                          isActive && "brand-gradient text-primary-foreground",
                        )}
                      >
                        <span className="min-w-0 truncate">{t.title}</span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {treinoAtual && (
                <TreinoCard
                  treino={treinoAtual}
                  alunoId={alunoId}
                  trainerName={student?.trainer_name ?? "—"}
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

      <ExerciseVideoDialog exercise={videoEx} onClose={() => setVideoEx(null)} />
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
          "max-w-[70vw] touch-none cursor-grab active:cursor-grabbing sm:max-w-[240px]",
          active && "brand-gradient text-primary-foreground",
        )}
        {...attributes}
        {...listeners}
      >
        <span className="min-w-0 truncate">{treino.title}</span>
      </Button>
    </div>
  );
}
