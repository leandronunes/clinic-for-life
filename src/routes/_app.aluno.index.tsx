import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Clock, Dumbbell, Archive, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { apiListTreinos, type Exercicio, type Treino } from "@/lib/mock-api";

export const Route = createFileRoute("/_app/aluno/")({
  head: () => ({ meta: [{ title: "Meu Treino — Núcleo For Life" }] }),
  component: MeuTreinoPage,
});

function MeuTreinoPage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["treinos", alunoId],
    queryFn: () => apiListTreinos(alunoId),
  });
  const [letra, setLetra] = useState<"A" | "B" | "C">("A");
  const [view, setView] = useState<"ativos" | "arquivados">("ativos");
  const [videoEx, setVideoEx] = useState<Exercicio | null>(null);

  const lista = view === "ativos" ? data?.ativos ?? [] : data?.arquivados ?? [];
  const treinoAtual = lista.find((t) => t.letra === letra) ?? lista[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Meu Treino</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {user?.name?.split(" ")[0]} — seu plano A/B/C atualizado pelo seu Personal.
        </p>
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
                {(["A", "B", "C"] as const).map((l) => {
                  const exists = lista.some((t) => t.letra === l);
                  if (!exists) return null;
                  const active = treinoAtual?.letra === l;
                  return (
                    <Button
                      key={l}
                      variant={active ? "default" : "outline"}
                      onClick={() => setLetra(l)}
                      className={active ? "brand-gradient text-primary-foreground" : ""}
                    >
                      Treino {l}
                    </Button>
                  );
                })}
              </div>

              {treinoAtual && <TreinoCard treino={treinoAtual} onWatch={setVideoEx} />}
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

function TreinoCard({ treino, onWatch }: { treino: Treino; onWatch: (e: Exercicio) => void }) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-base font-bold text-primary-foreground">
              {treino.letra}
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
      </CardContent>
    </Card>
  );
}
