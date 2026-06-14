import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, ImageIcon, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  apiGetAluno,
  apiListBiomecanica,
  apiUploadBiomecanica,
  apiDeleteBiomecanica,
  apiGetEstrutural,
  apiSetEstrutural,
  ESTRUTURAL_ITENS,
  type BiomecanicaSlot,
  type BiomecanicaImagens,
  type EstruturalItem,
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/biomecanica")({
  head: () => ({ meta: [{ title: "Avaliação Biomecânica — Núcleo For Life" }] }),
  component: BiomecanicaPage,
});

const PLANO_CORONAL: { slot: BiomecanicaSlot; label: string }[] = [
  { slot: "frontal", label: "Visão Frontal" },
  { slot: "posterior", label: "Posterior" },
  { slot: "flexao_tronco", label: "Flexão de tronco" },
];

const PLANO_SAGITAL: { slot: BiomecanicaSlot; label: string }[] = [
  { slot: "lado_esquerdo", label: "Lado esquerdo" },
  { slot: "lado_direito", label: "Lado direito" },
  { slot: "flexao_perfil", label: "Flexão perfil" },
];

function BiomecanicaPage() {
  const { user, effectiveAlunoId, canWrite, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const qc = useQueryClient();

  const { data: imagens = {}, isLoading } = useQuery({
    queryKey: ["biomecanica", alunoId],
    queryFn: () => apiListBiomecanica(alunoId),
  });

  const { data: alunoResp } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => apiGetAluno(alunoId),
    enabled: isImpersonating,
  });
  const alunoNome = alunoResp?.data?.nome;

  const refresh = () => qc.invalidateQueries({ queryKey: ["biomecanica", alunoId] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Avaliação Biomecânica</h1>
        <p className="text-sm text-muted-foreground">
          {isImpersonating && alunoNome
            ? `Avaliação biomecânica de ${alunoNome}.`
            : "Registro fotográfico dos planos coronal e sagital para análise postural."}
        </p>
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
    </div>
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
  slots: { slot: BiomecanicaSlot; label: string }[];
  imagens: BiomecanicaImagens;
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
  slot: BiomecanicaSlot;
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
      await apiUploadBiomecanica(alunoId, slot, file);
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
      await apiDeleteBiomecanica(alunoId, slot);
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
