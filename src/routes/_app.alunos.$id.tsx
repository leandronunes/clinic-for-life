import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Mail, Phone, Calendar, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGetAluno, apiProcessBioimpedanciaCsv, type BioImportResult } from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alunos/$id")({
  head: () => ({ meta: [{ title: "Detalhe do Aluno — Núcleo For Life" }] }),
  component: AlunoDetalhePage,
});

function AlunoDetalhePage() {
  const { id } = Route.useParams();
  const { user, hasRole, canWrite } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["aluno", id],
    queryFn: () => apiGetAluno(id),
  });

  if (hasRole("aluno")) return <Navigate to="/aluno" />;
  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  const aluno = data?.data;
  if (!aluno) return <div className="text-sm text-muted-foreground">Aluno não encontrado.</div>;

  // Personal só pode ver seus alunos
  if (hasRole("personal") && user?.personal_id && aluno.personal_id !== user.personal_id) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este aluno não está associado ao seu cadastro.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/usuarios"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
        <Badge className={aluno.status === "ativo" ? "bg-success text-success-foreground" : ""}>{aluno.status}</Badge>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{aluno.nome}</h1>
              <p className="text-sm text-muted-foreground">Personal: {aluno.personal_nome}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={Mail} label="E-mail" value={aluno.email} />
            <Info icon={Phone} label="Telefone" value={aluno.telefone} />
            <Info icon={Calendar} label="Nascimento" value={aluno.nascimento} />
            <Info icon={Ruler} label="Altura" value={`${aluno.altura_cm} cm`} />
          </div>
        </CardContent>
      </Card>

      {canWrite && <BioUploadCard alunoEmail={aluno.email} />}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function BioUploadCard({ alunoEmail }: { alunoEmail: string }) {
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
    } catch {
      toast.error("Falha ao processar o arquivo");
    } finally { setLoading(false); }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Bioimpedância (InBody)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Envie o CSV exportado do InBody. Apenas administradores e personais podem fazer upload.
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
