import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileText, Upload, Loader2, Trash2, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchExams, createExam, deleteExam, type Exam } from "@/lib/api/exams";
import { uploadExamToS3 } from "@/lib/api/uploads";
import { useAuth } from "@/contexts/use-auth";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/exames")({
  head: () =>
    pageHead({
      path: "/aluno/exames",
      title: "Exames — Núcleo For Life",
      description:
        "Envie e gerencie os seus exames clínicos, laboratoriais e de imagem para acompanhamento do seu plano.",
    }),
  component: ExamesPage,
});

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function ExamesPage() {
  const { user, effectiveAlunoId, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const canWrite = !isImpersonating; // o aluno (ou ele mesmo na sessão) pode enviar
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: exames = [], isLoading } = useQuery({
    queryKey: ["exames", alunoId],
    queryFn: () => fetchExams(alunoId),
    enabled: !!alunoId,
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");
      const fileUrl = await uploadExamToS3(alunoId, file);
      return createExam(alunoId, {
        name: nome,
        description: descricao || undefined,
        file_url: fileUrl,
        content_type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Exame enviado");
      setFile(null);
      setNome("");
      setDescricao("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["exames", alunoId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha no envio"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteExam(alunoId, id),
    onSuccess: () => {
      toast.success("Exame removido");
      qc.invalidateQueries({ queryKey: ["exames", alunoId] });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      toast.error("Arquivo excede o limite de 20MB");
      e.target.value = "";
      return;
    }
    setFile(f);
    if (f && !nome) setNome(f.name.replace(/\.[^.]+$/, ""));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Exames</h1>
        <p className="text-sm text-muted-foreground">
          Envie os seus exames (PDF, imagens etc.) para que o seu personal possa acompanhar a sua
          evolução clínica.
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" /> Enviar novo exame
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="exame-arquivo">Arquivo</Label>
              <Input
                id="exame-arquivo"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} — {formatBytes(file.size)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exame-nome">Nome do exame</Label>
              <Input
                id="exame-nome"
                placeholder="Ex.: Hemograma completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exame-desc">Observações (opcional)</Label>
              <Textarea
                id="exame-desc"
                rows={3}
                placeholder="Data do exame, laboratório, observações…"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => uploadMut.mutate()}
              disabled={!file || uploadMut.isPending}
            >
              {uploadMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Enviar exame
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="Lista de exames" className="space-y-3">
        <h2 className="text-lg font-semibold">Meus exames</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : exames.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum exame enviado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exames.map((ex) => (
              <ExameCard
                key={ex.id}
                exame={ex}
                canDelete={canWrite}
                onDelete={() => deleteMut.mutate(ex.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ExameCard({
  exame,
  canDelete,
  onDelete,
}: {
  exame: Exam;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isImage = exame.content_type.startsWith("image/");
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          <span className="truncate">{exame.name}</span>
        </CardTitle>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(exame.uploaded_at).toLocaleDateString("pt-BR")} · {formatBytes(exame.size)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isImage ? (
          <img
            src={exame.file_url}
            alt={exame.name}
            className="h-32 w-full rounded-md border border-border object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-32 place-items-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
            {exame.content_type || "Arquivo"}
          </div>
        )}
        {exame.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground">{exame.description}</p>
        )}
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary" className="flex-1">
            <a
              href={exame.file_url}
              download={exame.name}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Abrir
            </a>
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remover exame"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover exame?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá permanentemente o arquivo "{exame.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
