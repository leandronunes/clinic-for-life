import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Scale, Flame, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { apiListEvolucao } from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_app/aluno/bioimpedancia")({
  head: () => ({ meta: [{ title: "Minha Bioimpedância — Núcleo For Life" }] }),
  component: AlunoBioPage,
});

function AlunoBioPage() {
  const { user, hasRole } = useAuth();
  if (!hasRole("aluno")) return <Navigate to="/dashboard" />;

  const { data = [], isLoading } = useQuery({
    queryKey: ["evolucao", user?.id],
    queryFn: () => apiListEvolucao(user?.id ?? ""),
  });

  const ultima = data[data.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Minha Bioimpedância</h1>
        <p className="text-sm text-muted-foreground">
          Histórico das avaliações InBody enviadas pelo seu personal. Esta visão é somente leitura.
        </p>
      </div>

      {ultima && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi icon={Scale} label="Peso atual" value={`${ultima.peso_kg} kg`} />
          <Kpi icon={Activity} label="Massa muscular" value={`${ultima.massa_muscular_kg} kg`} />
          <Kpi icon={Flame} label="Gordura corporal" value={`${ultima.gordura_pct} %`} />
        </div>
      )}

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Evolução de peso</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="peso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="data" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="peso_kg" stroke="var(--color-chart-1)" fill="url(#peso)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data].reverse().map((p) => (
                <TableRow key={p.data}>
                  <TableCell>{p.data}</TableCell>
                  <TableCell>{p.peso_kg} kg</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.massa_muscular_kg} kg</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.gordura_pct} %</TableCell>
                  <TableCell>{p.imc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
