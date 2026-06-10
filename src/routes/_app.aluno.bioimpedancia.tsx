import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Activity, Scale, Flame, Dumbbell, Upload, FileSpreadsheet,
  Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  apiGetAluno, apiListEvolucao, apiProcessBioimpedanciaCsv, type BioImportResult,
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/bioimpedancia")({
  head: () => ({ meta: [{ title: "Minha Bioimpedância — Núcleo For Life" }] }),
  component: AlunoBioPage,
});

function AlunoBioPage() {
  const { user, effectiveAlunoId, canWrite, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["evolucao", alunoId],
    queryFn: () => apiListEvolucao(alunoId),
  });

  // Quando admin/personal está visualizando como aluno, mostramos o nome do aluno alvo.
  const { data: alunoResp } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => apiGetAluno(alunoId),
    enabled: isImpersonating,
  });
  const alunoNome = alunoResp?.data?.nome;

  const ultima = data[data.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Minha Bioimpedância</h1>
        <p className="text-sm text-muted-foreground">
          {isImpersonating && alunoNome
            ? `Histórico InBody de ${alunoNome}.`
            : "Histórico das avaliações InBody enviadas pelo seu personal. Esta visão é somente leitura."}
        </p>
      </div>

      {/* Upload visível apenas para admin/personal */}
      {canWrite && (
        <BioUploadCard
          alunoEmail={alunoResp?.data?.email ?? user?.email ?? ""}
          onImported={() => refetch()}
        />
      )}

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

function BioUploadCard({ alunoEmail, onImported }: { alunoEmail: string; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BioImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (f: File) => {
    setFile(f); setResult(null); setLoading(true);
    try {
      const r = await apiProcessBioimpedanciaCsv(f);
      setResult(r);
      if (r.erros.length === 0) toast.success(`${r.importados} registros importados para ${alunoEmail}`);
      else toast.warning(`${r.importados} importados, ${r.erros.length} com erro`);
      onImported();
    } catch {
      toast.error("Falha ao processar o arquivo");
    } finally { setLoading(false); }
  };

  return (
    <Card className="shadow-soft border-accent/30">
      <CardHeader>
        <CardTitle className="text-base">Upload de Bioimpedância (InBody)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Esta área é visível apenas para administradores e personais. Envie o CSV exportado do InBody para registrar a avaliação deste aluno.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleProcess(f); }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            drag ? "border-accent bg-accent/5" : "border-border hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleProcess(e.target.files[0])}
          />
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full brand-gradient text-primary-foreground">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <h3 className="mt-3 font-semibold">{loading ? "Processando..." : "Arraste o CSV ou clique para enviar"}</h3>
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
              {result.erros.length === 0 ? (
                <><CheckCircle2 className="h-4 w-4 text-success" /> {result.importados} registros válidos</>
              ) : (
                <><AlertTriangle className="h-4 w-4 text-warning" /> {result.importados} ok · {result.erros.length} erros</>
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
                    <TableCell>{r.data}</TableCell>
                    <TableCell>{r.peso_kg} kg</TableCell>
                    <TableCell className="hidden md:table-cell">{r.massa_muscular_kg} kg</TableCell>
                    <TableCell className="hidden md:table-cell">{r.gordura_pct}%</TableCell>
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
