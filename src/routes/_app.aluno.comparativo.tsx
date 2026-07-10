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
import { useAuth } from "@/contexts/use-auth";
import { fetchMeasurements, type BioimpedanceMeasurement } from "@/lib/api/bioimpedance";
import { formatDatePtBR } from "@/lib/utils";

export const Route = createFileRoute("/_app/aluno/comparativo")({
  component: ComparativoPage,
});

function ComparativoPage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["evolucao", alunoId],
    queryFn: () => fetchMeasurements(alunoId),
  });

  const snapshots = measurements
    .filter((m) => m.photo_url)
    .sort((a, b) => a.measured_on.localeCompare(b.measured_on));

  const [antesId, setAntesId] = useState<string>("");
  const [depoisId, setDepoisId] = useState<string>("");

  useEffect(() => {
    if (snapshots.length >= 1 && !antesId && !depoisId) {
      setAntesId(snapshots[0].id);
      setDepoisId(snapshots[snapshots.length - 1].id);
    }
  }, [snapshots, antesId, depoisId]);

  const antes = snapshots.find((m) => m.id === antesId);
  const depois = snapshots.find((m) => m.id === depoisId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Antes &amp; Depois</h1>
        <p className="text-sm text-muted-foreground">
          Compare lado a lado dois momentos da sua evolução.
        </p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      )}

      {!isLoading && snapshots.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Nenhuma medição com foto registrada ainda. Faça o upload de uma medição InBody e associe
            uma foto na seção de Evolução.
          </CardContent>
        </Card>
      )}

      {snapshots.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Antes
                </Label>
                <Select value={antesId} onValueChange={setAntesId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Escolha uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {formatDatePtBR(m.measured_on)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="hidden h-6 w-6 self-center text-muted-foreground sm:block" />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Depois
                </Label>
                <Select value={depoisId} onValueChange={setDepoisId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Escolha uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {formatDatePtBR(m.measured_on)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {antes && depois && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SnapshotCard label="Antes" measurement={antes} accent="muted" />
            <SnapshotCard label="Depois" measurement={depois} accent="brand" />
          </div>

          <Card className="shadow-soft">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
              <DiffRow
                label="Peso"
                antes={antes.weight_kg}
                depois={depois.weight_kg}
                suffix=" kg"
                betterDown
              />
              <DiffRow
                label="Gordura corporal"
                antes={antes.fat_percentage}
                depois={depois.fat_percentage}
                suffix=" %"
                betterDown
              />
              <DiffRow
                label="Massa muscular"
                antes={antes.muscle_mass_kg}
                depois={depois.muscle_mass_kg}
                suffix=" kg"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export function SnapshotCard({
  label,
  measurement,
  accent,
}: {
  label: string;
  measurement: BioimpedanceMeasurement;
  accent: "muted" | "brand";
}) {
  return (
    <Card className="overflow-hidden shadow-soft">
      <div className="relative aspect-[3/4] w-full bg-muted">
        <img
          src={measurement.photo_url!}
          alt={`${label} - ${measurement.measured_on}`}
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute left-3 top-3 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground ${
            accent === "brand" ? "brand-gradient" : "bg-foreground/70"
          }`}
        >
          {label}
        </div>
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" /> {formatDatePtBR(measurement.measured_on)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="Peso" value={`${measurement.weight_kg.toFixed(1)} kg`} />
          <Stat
            label="Gordura"
            value={
              measurement.fat_percentage != null
                ? `${measurement.fat_percentage.toFixed(1)} %`
                : "—"
            }
          />
          <Stat
            label="Músculo"
            value={
              measurement.muscle_mass_kg != null
                ? `${measurement.muscle_mass_kg.toFixed(1)} kg`
                : "—"
            }
          />
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

export function DiffRow({
  label,
  antes,
  depois,
  suffix,
  betterDown,
}: {
  label: string;
  antes: number;
  depois: number;
  suffix: string;
  betterDown?: boolean;
}) {
  const diff = depois - antes;
  const pct = antes !== 0 ? (diff / antes) * 100 : 0;
  const positive = betterDown ? diff < 0 : diff > 0;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {depois.toFixed(1)}
          {suffix}
        </span>
        <span className="text-sm text-muted-foreground">
          de {antes.toFixed(1)}
          {suffix}
        </span>
      </div>
      <div
        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}
      >
        {diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {diff > 0 ? "+" : ""}
        {diff.toFixed(1)}
        {suffix} ({pct > 0 ? "+" : ""}
        {pct.toFixed(1)}%)
      </div>
    </div>
  );
}
