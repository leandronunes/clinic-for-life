import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { TrendingDown, TrendingUp, Scale, Flame, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { apiListEvolucao, type EvolucaoPonto } from "@/lib/mock-api";

export const Route = createFileRoute("/_app/aluno/evolucao")({
  head: () => ({ meta: [{ title: "Evolução — Núcleo For Life" }] }),
  component: EvolucaoPage,
});

type Metric = "peso_kg" | "gordura_pct" | "massa_muscular_kg";

const METRICS: Record<Metric, { label: string; color: string; suffix: string; better: "down" | "up"; icon: typeof Scale }> = {
  peso_kg: { label: "Peso", color: "var(--color-chart-1)", suffix: " kg", better: "down", icon: Scale },
  gordura_pct: { label: "Gordura corporal", color: "var(--color-chart-4)", suffix: " %", better: "down", icon: Flame },
  massa_muscular_kg: { label: "Massa muscular", color: "var(--color-chart-2)", suffix: " kg", better: "up", icon: Activity },
};

function EvolucaoPage() {
  const { user, effectiveAlunoId } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const { data = [], isLoading } = useQuery({
    queryKey: ["evolucao", alunoId],
    queryFn: () => apiListEvolucao(alunoId),
  });
  const [metric, setMetric] = useState<Metric>("peso_kg");

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: new Date(d.data).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
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

      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <MetricCard key={m} metric={m} data={data} active={metric === m} onClick={() => setMetric(m)} />
        ))}
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">{METRICS[metric].label} ao longo do tempo</CardTitle>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <TabsList>
              <TabsTrigger value="peso_kg">Peso</TabsTrigger>
              <TabsTrigger value="gordura_pct">Gordura</TabsTrigger>
              <TabsTrigger value="massa_muscular_kg">Músculo</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Carregando...</div>
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
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(1)}${METRICS[metric].suffix}`, METRICS[metric].label]}
                  />
                  <Area type="monotone" dataKey={metric} stroke={METRICS[metric].color} fill="url(#metricGrad)" strokeWidth={2.5} />
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
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  formatter={(v: number) => [v.toFixed(2), "IMC"]}
                />
                <Line type="monotone" dataKey="imc" stroke="var(--color-chart-3)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ metric, data, active, onClick }: { metric: Metric; data: EvolucaoPonto[]; active: boolean; onClick: () => void }) {
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
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</div>
              <div className="mt-2 text-3xl font-bold">
                {last.toFixed(1)}<span className="text-base font-normal text-muted-foreground">{cfg.suffix}</span>
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg brand-gradient text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
            {diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {diff > 0 ? "+" : ""}{diff.toFixed(1)}{cfg.suffix} no período
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
