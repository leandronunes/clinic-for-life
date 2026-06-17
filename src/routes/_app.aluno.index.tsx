import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Clock, Dumbbell, Archive, CheckCircle2, Info, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchWorkouts, createWorkout, updateWorkout, archiveWorkout,
  createExercise, updateExercise, deleteExercise,
  type Exercise, type Workout,
} from "@/lib/api/workouts";
import { ExercicioVideoInput, isUploadedVideo } from "@/components/ExercicioVideoInput";
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
  const [posicao, setPosicao] = useState<number | null>(null);
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const [videoEx, setVideoEx] = useState<Exercise | null>(null);

  const lista = [...(view === "ativos" ? data?.active ?? [] : data?.archived ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const treinoAtual = lista.find((t) => t.position === posicao) ?? lista[0];

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
            onCreated={(t) => setPosicao(t.position)}
          />
        )}
      </div>


      <Tabs value={view} onValueChange={(v) => { setView(v as "ativos" | "arquivados"); setPosicao(null); }}>
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

          {isLoading && <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>}

          {!isLoading && lista.length === 0 && (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Nenhum treino {view === "ativos" ? "ativo" : "arquivado"}.</CardContent></Card>
          )}

          {!isLoading && lista.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {lista.map((t) => {
                    const active = treinoAtual?.position === t.position;
                  return (
                    <Button
                      key={t.id}
                      variant={active ? "default" : "outline"}
                      onClick={() => setPosicao(t.position)}
                      className={active ? "brand-gradient text-primary-foreground" : ""}
                    >
                      Treino {t.position}
                    </Button>
                  );
                })}
              </div>

              {treinoAtual && (
                <TreinoCard
                  treino={treinoAtual}
                  alunoId={alunoId}
                  onWatch={setVideoEx}
                  canEdit={canWrite && treinoAtual.status === "active"}
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
              {videoEx?.sets} séries × {videoEx?.reps} reps · Descanso {videoEx?.rest_seconds}s
            </DialogDescription>
          </DialogHeader>
          {videoEx && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              {isUploadedVideo(videoEx.video_url) ? (
                <video
                  src={videoEx.video_url}
                  controls
                  playsInline
                  className="h-full w-full"
                />
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

function TreinoCard({
  treino, alunoId, onWatch, canEdit,
}: { treino: Workout; alunoId: string; onWatch: (e: Exercise) => void; canEdit: boolean }) {
  const qc = useQueryClient();
  const archiveMut = useMutation({
    mutationFn: () => archiveWorkout(alunoId, treino.id),
    onSuccess: () => {
      toast.success("Treino arquivado");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Não foi possível arquivar o treino"),
  });

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
          <Badge variant={treino.status === "active" ? "default" : "secondary"} className={treino.status === "active" ? "bg-success text-success-foreground" : ""}>
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
                    <AlertDialogAction onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending}>
                      {archiveMut.isPending ? "Arquivando..." : "Arquivar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {treino.exercises.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum exercício neste treino ainda.
          </div>
        )}
        {treino.exercises.map((ex, idx) => (
          <div
            key={ex.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                {idx + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ex.name}</span>
                  <Badge variant="outline" className="text-[10px]">{ex.muscle_group}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Dumbbell className="h-3 w-3" />{ex.sets}×{ex.reps}{ex.load_kg ? ` · ${ex.load_kg}kg` : ""}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{ex.rest_seconds}s descanso</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button size="sm" variant="outline" onClick={() => onWatch(ex)}>
                <Play className="mr-1 h-4 w-4" /> Ver execução
              </Button>
              {canEdit && (
                <>
                  <ExercicioFormDialog
                    mode="edit"
                    treinoId={treino.id}
                    alunoId={alunoId}
                    exercicio={ex}
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Editar exercício">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DeleteExercicioButton treinoId={treino.id} alunoId={alunoId} exercicio={ex} />
                </>
              )}
            </div>
          </div>
        ))}

        {canEdit && <ExercicioFormDialog mode="create" treinoId={treino.id} alunoId={alunoId} />}
      </CardContent>
    </Card>
  );
}

/* ---------------- Dialogs (admin/personal) ---------------- */

function NovoTreinoDialog({
  alunoId, personalNome, onCreated,
}: { alunoId: string; personalNome?: string; onCreated?: (t: Workout) => void }) {
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
  mode, alunoId, personalNome, treino, trigger, onCreated,
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
        ? createWorkout(alunoId, { title: form.title, focus: form.focus, trainer_name: personalNome })
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
    onError: () => toast.error(mode === "create" ? "Não foi possível cadastrar o treino" : "Não foi possível atualizar o treino"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && mode === "edit" && treino) setForm({ title: treino.title, focus: treino.focus }); }}>
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
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title.trim() || !form.focus.trim()}
          >
            {mut.isPending ? "Salvando..." : mode === "create" ? "Criar treino" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExercicioFormDialog({
  mode, treinoId, alunoId, exercicio, trigger,
}: {
  mode: "create" | "edit";
  treinoId: string;
  alunoId: string;
  exercicio?: Exercise;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const emptyForm = {
    name: "", muscle_group: "", sets: 3, reps: "10-12",
    load_kg: undefined as number | undefined,
    rest_seconds: 60, video_url: "", notes: "",
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
        ? createExercise(alunoId, treinoId, { ...form, load_kg: form.load_kg, notes: form.notes || undefined })
        : updateExercise(alunoId, treinoId, exercicio!.id, { ...form, load_kg: form.load_kg, notes: form.notes || undefined }),
    onSuccess: () => {
      toast.success(mode === "create" ? "Exercício adicionado" : "Exercício atualizado");
      qc.invalidateQueries({ queryKey: ["treinos"] });
      setOpen(false);
      if (mode === "create") setForm(emptyForm);
    },
    onError: () => toast.error(mode === "create" ? "Falha ao adicionar exercício" : "Falha ao atualizar exercício"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && mode === "edit" && exercicio) setForm(formFromEx(exercicio)); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="w-full border-dashed">
            <Plus className="mr-1 h-4 w-4" /> Adicionar exercício / série
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Adicionar exercício" : "Editar exercício"}</DialogTitle>
          <DialogDescription>
            Cadastre o exercício com séries, repetições, carga e descanso.
          </DialogDescription>
        </DialogHeader>
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
              type="number" min={1} max={10}
              value={form.sets}
              onChange={(e) => setForm({ ...form, sets: Math.max(1, Number(e.target.value) || 1) })}
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
              type="number" min={0} step={0.5}
              value={form.load_kg ?? ""}
              onChange={(e) => setForm({ ...form, load_kg: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </Field>
          <Field label="Descanso (s)">
            <Input
              type="number" min={0} step={5}
              value={form.rest_seconds}
              onChange={(e) => setForm({ ...form, rest_seconds: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Vídeo de demonstração" className="sm:col-span-2">
            <ExercicioVideoInput
              value={form.video_url}
              onChange={(url) => setForm({ ...form, video_url: url })}
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name.trim() || !form.muscle_group.trim() || !form.reps.trim()}
          >
            {mut.isPending ? "Salvando..." : mode === "create" ? "Adicionar" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExercicioButton({ treinoId, alunoId, exercicio }: { treinoId: string; alunoId: string; exercicio: Exercise }) {
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

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
