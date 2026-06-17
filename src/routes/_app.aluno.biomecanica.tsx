import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, ImageIcon, Check, X, History, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  fetchBiomechanicsAssessments,
  fetchCurrentBiomechanicsAssessment,
  newBiomechanicsAssessment,
  uploadBiomechanicsSlot,
  removeBiomechanicsSlot,
  type BiomechanicsSlotBackend,
  type BiomechanicsImages,
  type BiomechanicalAssessment,
} from "@/lib/api/biomechanics";
import {
  fetchStructuralAssessment,
  updateStructuralAssessment,
  type StructuralAssessment,
} from "@/lib/api/structural-assessment";
import { fetchStudent } from "@/lib/api/students";
import { fileToDataUrl } from "@/lib/api/evolution-photos";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/biomecanica")({
  component: BiomecanicaPage,
});


const PLANO_CORONAL: { slot: BiomechanicsSlotBackend; label: string }[] = [
  { slot: "frontal", label: "Visão Frontal" },
  { slot: "posterior", label: "Posterior" },
  { slot: "trunk_flexion", label: "Flexão de tronco" },
];

const PLANO_SAGITAL: { slot: BiomechanicsSlotBackend; label: string }[] = [
  { slot: "left_side", label: "Lado esquerdo" },
  { slot: "right_side", label: "Lado direito" },
  { slot: "profile_flexion", label: "Flexão perfil" },
];

const STRUCTURAL_ITEMS: { key: keyof StructuralAssessment; label: string }[] = [
  { key: "scoliosis", label: "Escoliose" },
  { key: "spine_rotation", label: "Rotação de coluna" },
  { key: "hip_rotation", label: "Rotação de quadril" },
  { key: "scapular_girdle_imbalance", label: "Desequilíbrio da cintura escapular" },
  { key: "scapular_dyskinesis", label: "Discinesia escapular" },
  { key: "shortening", label: "Encurtamento" },
  { key: "limb_length_difference", label: "Diferença no tamanho dos membros" },
  { key: "pelvic_anteversion", label: "Anteverso pélvica" },
  { key: "pelvic_retroversion", label: "Retroversão pélvica" },
  { key: "knee_valgus", label: "Joelho valgo" },
  { key: "knee_varus", label: "Joelho varo" },
  { key: "cavus_foot_arch", label: "Arco plantar cavo" },
  { key: "flat_foot_arch", label: "Arco plantar plano" },
];

function BiomecanicaPage() {
  const { user, effectiveAlunoId, canWrite, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const qc = useQueryClient();

  const { data: currentAssessment, isLoading } = useQuery({
    queryKey: ["biomecanica", alunoId],
    queryFn: () => fetchCurrentBiomechanicsAssessment(alunoId),
  });
  const imagens: BiomechanicsImages = currentAssessment?.images ?? {};

  const { data: student } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => fetchStudent(alunoId),
    enabled: isImpersonating,
  });
  const alunoNome = student?.name;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["biomecanica", alunoId] });
    qc.invalidateQueries({ queryKey: ["biomecanica-hist", alunoId] });
  };

  const hasAlguma = Object.keys(imagens).length > 0;
  const [novaBusy, setNovaBusy] = useState(false);

  const handleNovaAvaliacao = async () => {
    setNovaBusy(true);
    try {
      await newBiomechanicsAssessment(alunoId);
      toast.success("Nova avaliação iniciada. O conjunto anterior foi arquivado no histórico.");
      refresh();
    } catch {
      toast.error("Falha ao iniciar nova avaliação.");
    } finally {
      setNovaBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Avaliação Biomecânica</h1>
          <p className="text-sm text-muted-foreground">
            {isImpersonating && alunoNome
              ? `Avaliação biomecânica de ${alunoNome}.`
              : "Registro fotográfico dos planos coronal e sagital para análise postural."}
          </p>
        </div>
        {canWrite && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={novaBusy || !hasAlguma} className="sm:self-start">
                <Plus className="mr-2 h-4 w-4" />
                Nova avaliação
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Iniciar nova avaliação?</AlertDialogTitle>
                <AlertDialogDescription>
                  O conjunto atual de imagens dos planos coronal e sagital será arquivado no
                  histórico e você poderá enviar um novo conjunto. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleNovaAvaliacao}>
                  Iniciar nova avaliação
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <PlanoSection
        titulo="Plano Coronal"
        descricao="Análise no eixo frontal — frente, costas e flexão de tronco."
        slots={PLANO_CORONAL}
        imagens={imagens}
        loading={isLoading}
        alunoId={alunoId}
        canWrite={canWrite}
        onChanged={refresh}
      />

      <PlanoSection
        titulo="Plano Sagital"
        descricao="Análise no eixo lateral — perfis e flexão lateral."
        slots={PLANO_SAGITAL}
        imagens={imagens}
        loading={isLoading}
        alunoId={alunoId}
        canWrite={canWrite}
        onChanged={refresh}
      />

      <HistoricoBiomecanicaSection alunoId={alunoId} />

      <AvaliacaoEstruturalSection alunoId={alunoId} canWrite={canWrite} />
    </div>
  );
}

function HistoricoBiomecanicaSection({ alunoId }: { alunoId: string }) {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["biomecanica-hist", alunoId],
    queryFn: () => fetchBiomechanicsAssessments(alunoId),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Histórico de Avaliações
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Conjuntos de imagens de avaliações anteriores (planos coronal e sagital).
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid place-items-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : historico.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhuma avaliação anterior arquivada.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {historico.map((av: BiomechanicalAssessment, idx: number) => {
              const data = new Date(av.created_at);
              const dataFmt = data.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const horaFmt = data.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const total = Object.keys(av.images).length;
              return (
                <AccordionItem key={av.id} value={av.id}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex flex-1 items-center justify-between gap-2 pr-2">
                      <span>
                        Avaliação de {dataFmt}{" "}
                        <span className="text-muted-foreground">aàs {horaFmt}</span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="ml-2">
                            Mais recente
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {total}/6 imagens
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <HistoricoPlanoGrid titulo="Plano Coronal" slots={PLANO_CORONAL} imagens={av.images} />
                    <HistoricoPlanoGrid titulo="Plano Sagital" slots={PLANO_SAGITAL} imagens={av.images} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function HistoricoPlanoGrid({
  titulo,
  slots,
  imagens,
}: {
  titulo: string;
  slots: { slot: BiomechanicsSlotBackend; label: string }[];
  imagens: BiomechanicsImages;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h4>
      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map((s) => {
          const url = imagens[s.slot];
          return (
            <div key={s.slot} className="space-y-1">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted/30">
                {url ? (
                  <img src={url} alt={s.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6 opacity-50" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvaliacaoEstruturalSection({
  alunoId,
  canWrite,
}: {
  alunoId: string;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const { data: structural, isLoading } = useQuery({
    queryKey: ["estrutural", alunoId],
    queryFn: () => fetchStructuralAssessment(alunoId),
  });
  const [pending, setPending] = useState<keyof StructuralAssessment | null>(null);

  const handleToggle = async (key: keyof StructuralAssessment, value: boolean) => {
    setPending(key);
    try {
      await updateStructuralAssessment(alunoId, { [key]: value });
      await qc.invalidateQueries({ queryKey: ["estrutural", alunoId] });
    } catch {
      toast.error("Falha ao salvar avaliação.");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base uppercase tracking-wide">Avaliação Estrutural</CardTitle>
        <p className="text-xs text-muted-foreground">
          {canWrite
            ? "Marque os itens que o aluno apresenta."
            : "Avaliação registrada pelo personal."}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid place-items-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {STRUCTURAL_ITEMS.map(({ key, label }) => {
              const value = structural?.[key];
              return (
                <li key={key} className="flex items-center justify-between py-3 gap-4">
                  <span className="text-sm">{label}</span>
                  {canWrite ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Não</span>
                      <Switch
                        checked={value === true}
                        disabled={pending === key}
                        onCheckedChange={(v) => handleToggle(key, v)}
                      />
                      <span className="text-xs text-muted-foreground">Sim</span>
                    </div>
                  ) : value === undefined ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Não avaliado
                    </Badge>
                  ) : value ? (
                    <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">
                      <Check className="mr-1 h-3 w-3" /> Sim
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="mr-1 h-3 w-3" /> Não
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PlanoSection({
  titulo,
  descricao,
  slots,
  imagens,
  loading,
  alunoId,
  canWrite,
  onChanged,
}: {
  titulo: string;
  descricao: string;
  slots: { slot: BiomechanicsSlotBackend; label: string }[];
  imagens: BiomechanicsImages;
  loading: boolean;
  alunoId: string;
  canWrite: boolean;
  onChanged: () => void;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((s) => (
            <SlotCard
              key={s.slot}
              slot={s.slot}
              label={s.label}
              url={imagens[s.slot]}
              loading={loading}
              alunoId={alunoId}
              canWrite={canWrite}
              onChanged={onChanged}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SlotCard({
  slot,
  label,
  url,
  loading,
  alunoId,
  canWrite,
  onChanged,
}: {
  slot: BiomechanicsSlotBackend;
  label: string;
  url?: string;
  loading: boolean;
  alunoId: string;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    setBusy(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      await uploadBiomechanicsSlot(alunoId, slot, imageDataUrl);
      toast.success(`Imagem "${label}" enviada.`);
      onChanged();
    } catch {
      toast.error("Falha ao enviar imagem.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeBiomechanicsSlot(alunoId, slot);
      toast.success(`Imagem "${label}" removida.`);
      onChanged();
    } catch {
      toast.error("Falha ao remover imagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {url && canWrite && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={busy}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted/30">
        {loading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 opacity-50" />
              <span className="text-xs">Sem imagem cadastrada</span>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      {canWrite && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant={url ? "outline" : "default"}
            className="w-full"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {url ? "Substituir imagem" : "Fazer upload"}
          </Button>
        </>
      )}
    </div>
  );
}
