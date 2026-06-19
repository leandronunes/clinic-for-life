import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users,
  UserCog,
  Handshake,
  ClipboardList,
  Dumbbell,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchKpis, fetchActivity, type RangeFilter } from "@/lib/api/dashboard";
import { useAuth } from "@/contexts/auth-context";
export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const ICONS = {
  users: Users,
  trainer: UserCog,
  handshake: Handshake,
  clipboard: ClipboardList,
  dumbbell: Dumbbell,
};

const ADMIN_ONLY_ICONS = new Set(["trainer", "handshake"]);

function DashboardPage() {
  const { hasRole } = useAuth();
  const isAdminOnly = hasRole("admin");
  const [range, setRange] = useState<RangeFilter>("month");
  const { data: kpisRaw = [], isLoading: loadingKpis } = useQuery({
    queryKey: ["kpis", range],
    queryFn: () => fetchKpis(range),
  });
  const kpis = kpisRaw.filter((k) => isAdminOnly || !ADMIN_ONLY_ICONS.has(k.icon));
  const { data: series = [] } = useQuery({
    queryKey: ["activity", range],
    queryFn: () => fetchActivity(range),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral dos indicadores da clínica.</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as RangeFilter)}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="year">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(loadingKpis
          ? Array.from({ length: isAdminOnly ? 5 : 3 }).map((_, i) => ({
              label: "—",
              value: 0,
              delta: 0,
              icon: "users" as const,
              _skel: true,
              _i: i,
            }))
          : kpis
        ).map((k, i) => {
          const Icon = ICONS[k.icon];
          const up = k.delta >= 0;
          return (
            <Card key={i} className="shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {k.label}
                    </div>
                    <div className="mt-2 text-3xl font-bold text-foreground">
                      {k.value.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-lg brand-gradient text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${up ? "text-success" : "text-destructive"}`}
                >
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {up ? "+" : ""}
                  {k.delta.toFixed(1)}% vs período anterior
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="treinos"
                  name="Treinos"
                  stroke="var(--color-chart-1)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="avaliacoes"
                  name="Avaliações"
                  stroke="var(--color-chart-2)"
                  fill="url(#g2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
