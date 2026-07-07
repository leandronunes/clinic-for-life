import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Flame,
  Activity,
  Dumbbell,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/use-auth";
import {
  fetchMeasurements,
  deleteMeasurement,
  type BioimpedanceMeasurement,
} from "@/lib/api/bioimpedance";
import { importBioimpedanceCsv, type BioImportResult } from "@/lib/api/bioimpedance-import";
import { fetchStudent } from "@/lib/api/students";
import { PhotoUploadCard } from "@/components/PhotoUploadCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/evolucao")({
  component: EvolucaoPage,
});

type Metric = "weight_kg" | "fat_percentage" | "muscle_mass_kg";

const METRICS: Record<
  Metric,
  { label: string; color: string; suffix: string; better: "down" | "up"; icon: typeof Scale }
> = {
  weight_kg: {
    label: "Peso",
    color: "var(--color-chart-1)",
    suffix: " kg",
    better: "down",
    icon: Scale,
  },
  fat_percentage: {
    label: "Gordura corporal",
    color: "var(--color-chart-4)",
    suffix: " %",
    better: "down",
    icon: Flame,
  },
  muscle_mass_kg: {
    label: "Massa muscular",
    color: "var(--color-chart-2)",
    suffix: " kg",
    better: "up",
    icon: Activity,
  },
};

function EvolucaoPage() {
  const { user, effectiveAlunoId, canWrite, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["evolucao", alunoId],
    queryFn: () => fetchMeasurements(alunoId),
  });
  const { data: student } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => fetchStudent(alunoId),
    enabled: isImpersonating,
  });
  const [metric, setMetric] = useState<Metric>("weight_kg");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteMeasurement(alunoId, deletingId);
      await qc.invalidateQueries({ queryKey: ["evolucao", alunoId] });
      toast.success("Avaliação removida.");
    } catch {
      toast.error("Falha ao remover avaliação.");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: new Date(d.measured_on).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
      })),
    [data],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Evolução Física</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados de bioimpedância nos últimos 10 meses.
        </p>
      </div>

      {canWrite && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BioUploadCard
            alunoId={alunoId}
            alunoEmail={student?.email ?? user?.email ?? ""}
            onImported={() => refetch()}
          />
          <PhotoUploadCard
            alunoId={alunoId}
            alunoEmail={student?.email ?? user?.email ?? ""}
            measurements={data}
            onSaved={() => refetch()}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <MetricCard
            key={m}
            metric={m}
            data={data}
            active={metric === m}
            onClick={() => setMetric(m)}
          />
        ))}
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">{METRICS[metric].label} ao longo do tempo</CardTitle>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList>
              <TabsTrigger value="weight_kg">Peso</TabsTrigger>
              <TabsTrigger value="fat_percentage">Gordura</TabsTrigger>
              <TabsTrigger value="muscle_mass_kg">Músculo</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatted}>
                  <defs>
                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={METRICS[metric].color} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={METRICS[metric].color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [
                      `${v.toFixed(1)}${METRICS[metric].suffix}`,
                      METRICS[metric].label,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke={METRICS[metric].color}
                    fill="url(#metricGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-lg">IMC ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => [v.toFixed(2), "IMC"]}
                />
                <Line
                  type="monotone"
                  dataKey="bmi"
                  stroke="var(--color-chart-3)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4" /> Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead className="hidden sm:table-cell">Massa muscular</TableHead>
                <TableHead className="hidden sm:table-cell">Gordura</TableHead>
                <TableHead>IMC</TableHead>
                {canWrite && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data].reverse().map((p) => (
                <TableRow key={p.measured_on}>
                  <TableCell>{p.measured_on}</TableCell>
                  <TableCell>{p.weight_kg} kg</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.muscle_mass_kg} kg</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.fat_percentage} %</TableCell>
                  <TableCell>{p.bmi}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(p.id)}
                        aria-label={`Remover avaliação de ${p.measured_on}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente a avaliação e a foto vinculada, se houver. Deseja
              continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({
  metric,
  data,
  active,
  onClick,
}: {
  metric: Metric;
  data: BioimpedanceMeasurement[];
  active: boolean;
  onClick: () => void;
}) {
  const cfg = METRICS[metric];
  const Icon = cfg.icon;
  const first = data[0]?.[metric] ?? 0;
  const last = data[data.length - 1]?.[metric] ?? 0;
  const diff = last - first;
  const positive = cfg.better === "down" ? diff < 0 : diff > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left transition-all ${active ? "ring-2 ring-primary" : ""}`}
    >
      <Card className="shadow-soft hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {cfg.label}
              </div>
              <div className="mt-2 text-3xl font-bold">
                {last.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">{cfg.suffix}</span>
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg brand-gradient text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div
            className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}
          >
            {diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}
            {cfg.suffix} no período
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function BioUploadCard({
  alunoId,
  alunoEmail,
  onImported,
}: {
  alunoId: string;
  alunoEmail: string;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BioImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (f: File) => {
    setFile(f);
    setResult(null);
    setLoading(true);
    try {
      const r = await importBioimpedanceCsv(alunoId, f);
      setResult(r);
      if (r.errors.length === 0)
        toast.success(`${r.imported} registros importados para ${alunoEmail}`);
      else toast.warning(`${r.imported} importados, ${r.errors.length} com erro`);
      onImported();
    } catch {
      toast.error("Falha ao processar o arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-soft border-accent/30">
      <CardHeader>
        <CardTitle className="text-base">Upload de Bioimpedância (InBody)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Esta área é visível apenas para administradores e personais. Envie o CSV exportado do
          InBody para registrar a avaliação deste aluno.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleProcess(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            drag ? "border-accent bg-accent/5" : "border-border hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleProcess(e.target.files[0])}
          />
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full brand-gradient text-primary-foreground">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <h3 className="mt-3 font-semibold">
            {loading ? "Processando..." : "Arraste o CSV ou clique para enviar"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Colunas: <code>email,peso_kg,massa_muscular_kg,gordura_pct,data</code>
          </p>
          {file && !loading && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {file.name}
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border p-3 text-sm">
              {result.errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" /> {result.imported} registros
                  válidos
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-warning" /> {result.imported} ok ·{" "}
                  {result.errors.length} erros
                </>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead className="hidden md:table-cell">Massa M.</TableHead>
                  <TableHead className="hidden md:table-cell">Gordura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.preview.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.measured_on}</TableCell>
                    <TableCell>{r.weight_kg} kg</TableCell>
                    <TableCell className="hidden md:table-cell">{r.muscle_mass_kg} kg</TableCell>
                    <TableCell className="hidden md:table-cell">{r.fat_percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
