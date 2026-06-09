import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiProcessBioimpedanciaCsv, type BioImportResult } from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bioimpedancia")({
  head: () => ({ meta: [{ title: "Bioimpedância — Núcleo For Life" }] }),
  component: BioPage,
});

function BioPage() {
  const { canWrite } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BioImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  if (!canWrite) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-warning" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            O upload de bioimpedância (InBody) está disponível apenas para Administradores e Personais.
            Como aluno, você pode visualizar seus resultados na seção <strong>Evolução</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleProcess = async (f: File) => {
    setFile(f);
    setResult(null);
    setLoading(true);
    try {
      const r = await apiProcessBioimpedanciaCsv(f);
      setResult(r);
      if (r.erros.length === 0) toast.success(`${r.importados} registros importados`);
      else toast.warning(`${r.importados} importados, ${r.erros.length} com erro`);
    } catch {
      toast.error("Falha ao processar o arquivo");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleProcess(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bioimpedância (InBody)</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload do arquivo <code className="rounded bg-muted px-1">.csv</code> exportado do InBody para importar avaliações em lote.
        </p>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
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
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full brand-gradient text-primary-foreground">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <h3 className="mt-4 font-semibold">{loading ? "Processando arquivo..." : "Arraste o CSV aqui ou clique para selecionar"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Formato esperado: <code>email,peso_kg,massa_muscular_kg,gordura_pct,data</code>
            </p>
            {file && !loading && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" /> {file.name}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadSample()}>
              Baixar CSV de exemplo
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-soft lg:col-span-1">
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Stat label="Linhas processadas" value={result.total} />
              <Stat label="Importadas" value={result.importados} tone="success" />
              <Stat label="Com erro" value={result.erros.length} tone={result.erros.length ? "destructive" : "muted"} />
            </CardContent>
          </Card>

          <Card className="shadow-soft lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {result.erros.length === 0 ? (
                  <><CheckCircle2 className="h-4 w-4 text-success" /> Pré-visualização</>
                ) : (
                  <><AlertTriangle className="h-4 w-4 text-warning" /> Erros de validação</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {result.erros.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead className="w-20">Linha</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {result.erros.map((e) => (
                      <TableRow key={e.linha}>
                        <TableCell className="font-mono text-xs">#{e.linha}</TableCell>
                        <TableCell className="text-sm text-destructive">{e.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead className="hidden md:table-cell">Massa M.</TableHead>
                      <TableHead className="hidden md:table-cell">Gordura</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.preview.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.aluno_email}</TableCell>
                        <TableCell>{r.peso_kg} kg</TableCell>
                        <TableCell className="hidden md:table-cell">{r.massa_muscular_kg} kg</TableCell>
                        <TableCell className="hidden md:table-cell">{r.gordura_pct}%</TableCell>
                        <TableCell>{r.data}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "destructive" | "muted" }) {
  const color =
    tone === "success" ? "text-success"
      : tone === "destructive" ? "text-destructive"
      : tone === "muted" ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function downloadSample() {
  const sample = [
    "email,peso_kg,massa_muscular_kg,gordura_pct,data",
    "julia@email.com,62.4,28.1,22.5,2026-05-02",
    "pedro@email.com,84.2,40.3,18.4,2026-05-02",
    "ana@email.com,58.9,25.7,24.1,2026-05-02",
    "lucas@email.com,-70,32,20,2026-05-02",     // erro: peso negativo
    "ana@email.com,59.1,25.9,23.8,2026-05-02",  // erro: duplicado
  ].join("\n");
  const blob = new Blob([sample], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inbody_exemplo.csv";
  a.click();
  URL.revokeObjectURL(url);
}
