import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Clock, Dumbbell, Archive, CheckCircle2, Info, Plus } from "lucide-react";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import {
  apiAddExercicio, apiCreateTreino, apiListTreinos,
  type Exercicio, type Treino,
} from "@/lib/mock-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/")({
  head: () => ({ meta: [{ title: "Meu Treino — Núcleo For Life" }] }),
  component: MeuTreinoPage,
});

function MeuTreinoPage() {
  const { user, effectiveAlunoId, canWrite } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["treinos", alunoId],
    queryFn: () => apiListTreinos(alunoId),
  });
  const [posicao, setPosicao] = useState<number | null>(null);
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const [videoEx, setVideoEx] = useState<Exercicio | null>(null);

  const lista = [...(view === "ativos" ? data?.ativos ?? [] : data?.arquivados ?? [])].sort(
    (a, b) => a.posicao - b.posicao,
  );
  const treinoAtual = lista.find((t) => t.posicao === posicao) ?? lista[0];

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
            onCreated={(t) => setPosicao(t.posicao)}
          />
        )}
      </div>


      <Tabs value={view} onValueChange={(v) => setView(v as "ativos" | "arquivados")}>
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
                  const active = treinoAtual?.posicao === t.posicao;
                  return (
                    <Button
                      key={t.id}
                      variant={active ? "default" : "outline"}
                      onClick={() => setPosicao(t.posicao)}
                      className={active ? "brand-gradient text-primary-foreground" : ""}
                    >
                      Treino {t.posicao}
                    </Button>
                  );
                })}
              </div>

              {treinoAtual && (
                <TreinoCard
                  treino={treinoAtual}
                  onWatch={setVideoEx}
                  canEdit={canWrite && treinoAtual.status === "ativo"}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!videoEx} onOpenChange={(o) => !o && setVideoEx(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{videoEx?.nome}</DialogTitle>
            <DialogDescription>
              {videoEx?.series} séries × {videoEx?.reps} reps · Descanso {videoEx?.descanso_s}s
            </DialogDescription>
          </DialogHeader>
          {videoEx && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={videoEx.video_url}
                title={videoEx.nome}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {videoEx?.observacao && (
            <p className="rounded-md bg-muted p-3 text-sm">
              <strong>Observação do Personal:</strong> {videoEx.observacao}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TreinoCard({
  treino, onWatch, canEdit,
}: { treino: Treino; onWatch: (e: Exercicio) => void; canEdit: boolean }) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-base font-bold text-primary-foreground">
              {treino.posicao}
            </span>
            {treino.titulo}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {treino.foco} · {treino.exercicios.length} exercícios · Personal: {treino.personal_nome}
          </p>
        </div>
        <Badge variant={treino.status === "ativo" ? "default" : "secondary"} className={treino.status === "ativo" ? "bg-success text-success-foreground" : ""}>
          {treino.status === "ativo" ? "Ativo" : "Arquivado"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {treino.exercicios.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum exercício neste treino ainda.
          </div>
        )}
        {treino.exercicios.map((ex, idx) => (
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
                  <span className="font-semibold">{ex.nome}</span>
                  <Badge variant="outline" className="text-[10px]">{ex.grupo}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Dumbbell className="h-3 w-3" />{ex.series}×{ex.reps}{ex.carga_kg ? ` · ${ex.carga_kg}kg` : ""}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{ex.descanso_s}s descanso</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onWatch(ex)} className="self-start sm:self-auto">
              <Play className="mr-1 h-4 w-4" /> Ver execução
            </Button>
          </div>
        ))}

        {canEdit && <NovoExercicioDialog treinoId={treino.id} />}
      </CardContent>
    </Card>
  );
}

/* ---------------- Dialogs (admin/personal) ---------------- */

function NovoTreinoDialog({
  alunoId, personalNome, onCreated,
}: { alunoId: string; personalNome?: string; onCreated?: (t: Treino) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ titulo: string; foco: string }>({
    titulo: "",
    foco: "",
  });

  const mut = useMutation({
    mutationFn: () => apiCreateTreino(alunoId, { ...form, personal_nome: personalNome }),
    onSuccess: (novo) => {
      toast.success(`Treino ${novo.posicao} cadastrado`);
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      setForm({ titulo: "", foco: "" });
      onCreated?.(novo);
    },
    onError: () => toast.error("Não foi possível cadastrar o treino"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo treino
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar novo treino</DialogTitle>
          <DialogDescription>
            A posição é atribuída automaticamente conforme a ordem dos treinos ativos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input
              placeholder="Ex.: Peito, Ombro e Tríceps"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              maxLength={120}
            />
          </Field>
          <Field label="Foco" className="sm:col-span-2">
            <Input
              placeholder="Ex.: Empurrar (Push)"
              value={form.foco}
              onChange={(e) => setForm({ ...form, foco: e.target.value })}
              maxLength={80}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.titulo.trim() || !form.foco.trim()}
          >
            {mut.isPending ? "Salvando..." : "Criar treino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoExercicioDialog({ treinoId }: { treinoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", grupo: "", series: 3, reps: "10-12",
    carga_kg: undefined as number | undefined,
    descanso_s: 60, video_url: "", observacao: "",
  });

  const mut = useMutation({
    mutationFn: () => apiAddExercicio(treinoId, form),
    onSuccess: () => {
      toast.success("Exercício adicionado");
      qc.invalidateQueries({ queryKey: ["treinos"] });
      setOpen(false);
      setForm({ nome: "", grupo: "", series: 3, reps: "10-12", carga_kg: undefined, descanso_s: 60, video_url: "", observacao: "" });
    },
    onError: () => toast.error("Falha ao adicionar exercício"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full border-dashed">
          <Plus className="mr-1 h-4 w-4" /> Adicionar exercício / série
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar exercício</DialogTitle>
          <DialogDescription>
            Cadastre o exercício com séries, repetições, carga e descanso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input
              placeholder="Ex.: Supino reto com barra"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              maxLength={80}
            />
          </Field>
          <Field label="Grupo muscular">
            <Input
              placeholder="Ex.: Peito"
              value={form.grupo}
              onChange={(e) => setForm({ ...form, grupo: e.target.value })}
              maxLength={40}
            />
          </Field>
          <Field label="Séries">
            <Input
              type="number" min={1} max={10}
              value={form.series}
              onChange={(e) => setForm({ ...form, series: Math.max(1, Number(e.target.value) || 1) })}
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
              value={form.carga_kg ?? ""}
              onChange={(e) => setForm({ ...form, carga_kg: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </Field>
          <Field label="Descanso (s)">
            <Input
              type="number" min={0} step={5}
              value={form.descanso_s}
              onChange={(e) => setForm({ ...form, descanso_s: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
          <Field label="Vídeo (YouTube embed)" className="sm:col-span-2">
            <Input
              placeholder="https://www.youtube.com/embed/..."
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              maxLength={200}
            />
          </Field>
          <Field label="Observação" className="sm:col-span-2">
            <Textarea
              placeholder="Dica de execução (opcional)"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              maxLength={300}
              rows={2}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.nome.trim() || !form.grupo.trim() || !form.reps.trim()}
          >
            {mut.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
