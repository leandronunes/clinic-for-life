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

const ANAMNESE_SECOES: { titulo: string; itens: { key: AnamnesisKey; label: string }[] }[] = [
  {
    titulo: "Objetivos e Saúde",
    itens: [
      { key: "objectives", label: "Objetivos" },
      { key: "medicines", label: "Remédios em uso" },
      { key: "supplements", label: "Reposições / suplementos" },
      { key: "notes", label: "Observações gerais" },
    ],
  },
  {
    titulo: "Dados Clínicos",
    itens: [
      { key: "systolic_pressure", label: "Pressão sistólica" },
      { key: "diastolic_pressure", label: "Pressão diastólica" },
      { key: "variable_glycemia", label: "Glicemia variável" },
      { key: "height", label: "Altura (cm)" },
      { key: "weight", label: "Peso (kg)" },
    ],
  },
  {
    titulo: "Histórico Ortopédico",
    itens: [
      { key: "fracture", label: "Fraturas" },
      { key: "dislocations", label: "Luxações" },
      { key: "pain", label: "Dores" },
      { key: "orthopedic_notes", label: "Observações ortopédicas" },
    ],
  },
  {
    titulo: "Hábitos de Vida",
    itens: [
      { key: "meals", label: "Refeições por dia" },
      { key: "hydration", label: "Hidratação" },
      { key: "sleep", label: "Sono" },
      { key: "stool", label: "Fezes" },
      { key: "urine", label: "Urina" },
    ],
  },
];

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

  const [draft, setDraft] = useState<Record<AnamnesisKey, string>>({} as Record<AnamnesisKey, string>);
  const [savingItem, setSavingItem] = useState<AnamnesisKey | null>(null);

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

  const handleSave = async (key: AnamnesisKey) => {
    setSavingItem(key);
    try {
      const raw = draft[key] ?? "";
      const numericKeys: AnamnesisKey[] = ["systolic_pressure", "diastolic_pressure", "height", "weight", "meals"];
      const booleanKeys: AnamnesisKey[] = ["variable_glycemia"];
      let value: Anamnesis[typeof key];
      if (numericKeys.includes(key)) {
        value = raw === "" ? null : Number(raw);
      } else if (booleanKeys.includes(key)) {
        value = raw === "true" ? true : raw === "false" ? false : null;
      } else {
        value = raw || null;
      }
      await updateAnamnesis(alunoId, { [key]: value });
      await qc.invalidateQueries({ queryKey: ["anamnese", alunoId] });
      toast.success("Anamnese atualizada.");
    } catch {
      toast.error("Falha ao salvar.");
    } finally {
      setSavingItem(null);
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
                const dirty = value !== original;
                return (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`anamnese-${key}`}>{label}</Label>
                    {canWrite ? (
                      <>
                        <Textarea
                          id={`anamnese-${key}`}
                          rows={3}
                          value={value}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [key]: e.target.value }))
                          }
                          placeholder={`Informe ${label.toLowerCase()}…`}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={!dirty || savingItem === key}
                            onClick={() => handleSave(key)}
                          >
                            {savingItem === key ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                        {original || (
                          <span className="text-muted-foreground">Não informado.</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
