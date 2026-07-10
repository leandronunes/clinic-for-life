import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { ArrowLeft, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/use-auth";
import { fetchStudent } from "@/lib/api/students";
import { fetchMeasurements } from "@/lib/api/bioimpedance";
import {
  fetchBiomechanicsAssessments,
  fetchCurrentBiomechanicsAssessment,
} from "@/lib/api/biomechanics";
import { AvaliacaoEstruturalSection, HistoricoPlanoGrid } from "./_app.aluno.biomecanica";
import { PLANO_CORONAL, PLANO_SAGITAL } from "@/lib/api/biomechanics";
import { SnapshotCard, DiffRow } from "./_app.aluno.comparativo";
import { formatDatePtBR } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/_app/aluno/laudo")({
  component: LaudoPage,
});

export function LaudoPage() {
  const { user, effectiveAlunoId, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";

  const { data: student } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => fetchStudent(alunoId),
    enabled: isImpersonating,
  });
  const { data: measurements = [] } = useQuery({
    queryKey: ["evolucao", alunoId],
    queryFn: () => fetchMeasurements(alunoId),
    enabled: isImpersonating,
  });
  const { data: currentAssessment } = useQuery({
    queryKey: ["biomecanica", alunoId],
    queryFn: () => fetchCurrentBiomechanicsAssessment(alunoId),
    enabled: isImpersonating,
  });
  const { data: history = [] } = useQuery({
    queryKey: ["biomecanica-hist", alunoId],
    queryFn: () => fetchBiomechanicsAssessments(alunoId),
    enabled: isImpersonating,
  });

  const chartData = useMemo(
    () =>
      measurements.map((m) => ({
        ...m,
        label: new Date(m.measured_on).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
      })),
    [measurements],
  );

  const snapshots = useMemo(
    () =>
      measurements
        .filter((m) => m.photo_url)
        .sort((a, b) => a.measured_on.localeCompare(b.measured_on)),
    [measurements],
  );
  const antes = snapshots[0];
  const depois = snapshots[snapshots.length - 1];

  if (!isImpersonating) return <Navigate to="/aluno" />;

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gerar Laudo</h1>
          <p className="text-sm text-muted-foreground">
            Histórico completo de avaliações, pronto para impressão em A4.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <section className="print:break-inside-avoid">
        <div className="flex items-center gap-3">
          <BrandLogo size={36} />
          <div>
            <h2 className="text-xl font-bold">Laudo de Avaliação Física</h2>
            <p className="text-sm text-muted-foreground">
              {student?.name ?? "Aluno"} · {student?.email}
              {student?.trainer_name ? ` · Personal: ${student.trainer_name}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Gerado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </section>

      <section className="space-y-4 print:break-inside-avoid">
        <h3 className="text-lg font-semibold">Avaliação Postural / Biomecânica</h3>

        <AvaliacaoEstruturalSection alunoId={alunoId} canWrite={false} />

        <Card className="shadow-soft print:border print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Registro Fotográfico Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentAssessment && Object.keys(currentAssessment.images).length > 0 ? (
              <>
                <HistoricoPlanoGrid
                  titulo="Plano Coronal"
                  slots={PLANO_CORONAL}
                  imagens={currentAssessment.images}
                />
                <HistoricoPlanoGrid
                  titulo="Plano Sagital"
                  slots={PLANO_SAGITAL}
                  imagens={currentAssessment.images}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma foto registrada.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft print:border print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Histórico de Avaliações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Imagens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{new Date(h.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{Object.keys(h.images).length}/6</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4 print:break-inside-avoid">
        <h3 className="text-lg font-semibold">Composição Corporal (Bioimpedância)</h3>

        {measurements.length === 0 ? (
          <Card className="shadow-soft print:border print:shadow-none">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum dado de bioimpedância registrado.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-soft print:border print:shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Peso ao longo do tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="laudoWeightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="label"
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                        />
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
                          formatter={(v: number) => [`${v.toFixed(1)} kg`, "Peso"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="weight_kg"
                          stroke="var(--color-chart-1)"
                          fill="url(#laudoWeightGrad)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft print:border print:shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">IMC ao longo do tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="label"
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                        />
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
            </div>

            <Card className="shadow-soft print:border print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Histórico de Medições</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Massa muscular</TableHead>
                      <TableHead>Gordura</TableHead>
                      <TableHead>Gordura visceral</TableHead>
                      <TableHead>IMC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...measurements].reverse().map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDatePtBR(m.measured_on)}</TableCell>
                        <TableCell>{m.weight_kg} kg</TableCell>
                        <TableCell>{m.muscle_mass_kg} kg</TableCell>
                        <TableCell>{m.fat_percentage} %</TableCell>
                        <TableCell>{m.visceral_fat ?? "—"}</TableCell>
                        <TableCell>{m.bmi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <section className="space-y-4 print:break-inside-avoid">
        <h3 className="text-lg font-semibold">Comparativo Antes/Depois</h3>

        {!antes || !depois || antes.id === depois.id ? (
          <Card className="shadow-soft print:border print:shadow-none">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Fotos insuficientes para comparação — são necessárias ao menos duas medições com foto.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <SnapshotCard label="Antes" measurement={antes} accent="muted" />
              <SnapshotCard label="Depois" measurement={depois} accent="brand" />
            </div>
            <Card className="shadow-soft print:border print:shadow-none">
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
      </section>

      <footer className="border-t border-border pt-4 text-center text-xs text-muted-foreground print:break-inside-avoid">
        Laudo gerado automaticamente pelo sistema Núcleo For Life em{" "}
        {new Date().toLocaleString("pt-BR")}.
      </footer>
    </div>
  );
}
