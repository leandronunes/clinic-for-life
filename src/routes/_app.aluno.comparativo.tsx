import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { apiListFotos, type FotoEvolucao } from "@/lib/mock-api";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/aluno/comparativo")({
  head: () =>
    pageHead({
      path: "/aluno/comparativo",
      title: "Antes & Depois — Núcleo For Life",
      description:
        "Compare lado a lado as fotos do seu antes e depois para visualizar a evolução do seu corpo ao longo do tempo.",
    }),
  component: ComparativoPage,
});


function ComparativoPage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["fotos", alunoId],
    queryFn: () => apiListFotos(alunoId),
  });

  const [antesId, setAntesId] = useState<string>("");
  const [depoisId, setDepoisId] = useState<string>("");

  useEffect(() => {
    if (fotos.length >= 2 && !antesId && !depoisId) {
      setAntesId(fotos[0].id);
      setDepoisId(fotos[fotos.length - 1].id);
    }
  }, [fotos, antesId, depoisId]);

  const antes = fotos.find((f) => f.id === antesId);
  const depois = fotos.find((f) => f.id === depoisId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Antes & Depois</h1>
        <p className="text-sm text-muted-foreground">
          Compare lado a lado dois momentos da sua evolução.
        </p>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Antes</Label>
              <Select value={antesId} onValueChange={setAntesId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolha uma data" /></SelectTrigger>
                <SelectContent>
                  {fotos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{formatDate(f.data)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="hidden h-6 w-6 self-center text-muted-foreground sm:block" />
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Depois</Label>
              <Select value={depoisId} onValueChange={setDepoisId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Escolha uma data" /></SelectTrigger>
                <SelectContent>
                  {fotos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{formatDate(f.data)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Card><CardContent className="p-10 text-center text-muted-foreground">Carregando...</CardContent></Card>}

      {antes && depois && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PhotoCard label="Antes" foto={antes} accent="muted" />
            <PhotoCard label="Depois" foto={depois} accent="brand" />
          </div>

          <Card className="shadow-soft">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <DiffRow label="Peso" antes={antes.peso_kg} depois={depois.peso_kg} suffix=" kg" betterDown />
              <DiffRow label="Gordura corporal" antes={antes.gordura_pct} depois={depois.gordura_pct} suffix=" %" betterDown />
              <DiffRow label="Massa muscular" antes={antes.massa_muscular_kg} depois={depois.massa_muscular_kg} suffix=" kg" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function PhotoCard({ label, foto, accent }: { label: string; foto: FotoEvolucao; accent: "muted" | "brand" }) {
  return (
    <Card className="overflow-hidden shadow-soft">
      <div className="relative aspect-[3/4] w-full bg-muted">
        <img src={foto.url} alt={`${label} - ${foto.data}`} className="h-full w-full object-cover" />
        <div className={`absolute left-3 top-3 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground ${accent === "brand" ? "brand-gradient" : "bg-foreground/70"}`}>
          {label}
        </div>
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" /> {formatDate(foto.data)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Peso" value={`${foto.peso_kg.toFixed(1)} kg`} />
          <Stat label="Gordura" value={`${foto.gordura_pct.toFixed(1)} %`} />
          <Stat label="Músculo" value={`${foto.massa_muscular_kg.toFixed(1)} kg`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function DiffRow({ label, antes, depois, suffix, betterDown }: { label: string; antes: number; depois: number; suffix: string; betterDown?: boolean }) {
  const diff = depois - antes;
  const pct = (diff / antes) * 100;
  const positive = betterDown ? diff < 0 : diff > 0;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{depois.toFixed(1)}{suffix}</span>
        <span className="text-sm text-muted-foreground">de {antes.toFixed(1)}{suffix}</span>
      </div>
      <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
        {diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{suffix} ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)
      </div>
    </div>
  );
}
