import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchAnamnesis, updateAnamnesis, type Anamnesis } from "@/lib/api/anamnesis";
import { fetchStudent } from "@/lib/api/students";
import { useAuth } from "@/contexts/auth-context";
import { pageHead } from "@/lib/seo";
import { ANAMNESE_SECOES } from "@/lib/anamnese-secoes";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/anamnese")({
  head: () =>
    pageHead({
      path: "/aluno/anamnese",
      title: "Anamnese Dinâmica — Núcleo For Life",
      description:
        "Responda sua anamnese dinâmica: histórico de saúde, hábitos, objetivos e restrições para orientar o seu plano.",
    }),
  component: AnamnesePage,
});
type AnamnesisKey = keyof Anamnesis;

const NUMERIC_KEYS: AnamnesisKey[] = [
  "systolic_pressure",
  "diastolic_pressure",
  "height",
  "weight",
  "meals",
];
const BOOLEAN_KEYS: AnamnesisKey[] = ["variable_glycemia"];

function castValue(key: AnamnesisKey, raw: string): Anamnesis[typeof key] {
  if (NUMERIC_KEYS.includes(key)) return raw === "" ? null : Number(raw);
  if (BOOLEAN_KEYS.includes(key)) return raw === "true" ? true : raw === "false" ? false : null;
  return raw || null;
}

function AnamnesePage() {
  const { user, effectiveAlunoId, canWrite, isImpersonating } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["anamnese", alunoId],
    queryFn: () => fetchAnamnesis(alunoId),
  });

  const { data: student } = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: () => fetchStudent(alunoId),
    enabled: isImpersonating,
  });
  const alunoNome = student?.name;

  const [draft, setDraft] = useState<Record<AnamnesisKey, string>>(
    {} as Record<AnamnesisKey, string>,
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const mapped: Record<AnamnesisKey, string> = {} as Record<AnamnesisKey, string>;
      for (const k of Object.keys(data) as AnamnesisKey[]) {
        const v = data[k];
        mapped[k] = v != null ? String(v) : "";
      }
      setDraft(mapped);
    }
  }, [data]);

  const isDirty =
    !!data &&
    ANAMNESE_SECOES.flatMap((s) => s.itens).some(
      ({ key }) => (draft[key] ?? "") !== String(data[key] ?? ""),
    );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.fromEntries(
        (Object.keys(draft) as AnamnesisKey[]).map((key) => [
          key,
          castValue(key, draft[key] ?? ""),
        ]),
      ) as Partial<Anamnesis>;
      await updateAnamnesis(alunoId, payload);
      await qc.invalidateQueries({ queryKey: ["anamnese", alunoId] });
      toast.success("Anamnese atualizada.");
    } catch {
      toast.error("Falha ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Anamnese Dinâmica</h1>
        <p className="text-sm text-muted-foreground">
          {isImpersonating && alunoNome
            ? `Anamnese de ${alunoNome}.`
            : canWrite
              ? "Preencha as informações clínicas, ortopédicas e de hábitos do aluno."
              : "Visualize as informações registradas pelo seu personal."}
        </p>
      </div>

      {ANAMNESE_SECOES.map((secao) => (
        <Card key={secao.titulo} className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base uppercase tracking-wide">{secao.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              secao.itens.map(({ key, label }) => {
                const value = draft[key] ?? "";
                const original = data ? String(data[key] ?? "") : "";
                return (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`anamnese-${key}`}>{label}</Label>
                    {canWrite ? (
                      <Textarea
                        id={`anamnese-${key}`}
                        rows={3}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        placeholder={`Informe ${label.toLowerCase()}…`}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                        {original || <span className="text-muted-foreground">Não informado.</span>}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}

      {canWrite && (
        <div className="flex justify-end">
          <Button size="lg" disabled={!isDirty || isSaving} onClick={handleSave}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
