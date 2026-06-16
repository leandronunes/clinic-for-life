import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, CheckCircle2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  apiGetAluno, apiSearchPersonais, apiUpdateAluno,
  type Aluno, type Personal,
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";


export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Núcleo For Life" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();

  if (!hasRole("aluno") || !user?.aluno_id) return <Navigate to="/dashboard" />;

  const { data, isLoading } = useQuery({
    queryKey: ["aluno", user.aluno_id],
    queryFn: () => apiGetAluno(user.aluno_id!),
  });

  const aluno = data?.data;
  const [form, setForm] = useState<Aluno | null>(null);
  const current = form ?? aluno ?? null;

  const saveMut = useMutation({
    mutationFn: () => apiUpdateAluno(user.aluno_id!, {
      nome: current!.nome, email: current!.email, telefone: current!.telefone,
      altura_cm: current!.altura_cm, sexo: current!.sexo, nascimento: current!.nascimento,
    }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["aluno", user.aluno_id] });
    },
  });

  const changePersonalMut = useMutation({
    mutationFn: (personalId: string) => apiUpdateAluno(user.aluno_id!, { personal_id: personalId }),
    onSuccess: (res) => {
      toast.success(`Personal alterado para ${res.data.personal_nome}`);
      qc.invalidateQueries({ queryKey: ["aluno", user.aluno_id] });
      setForm(null);
    },
  });

  if (isLoading || !current) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Atualize seus dados e escolha seu personal trainer.</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" className="sm:col-span-2">
              <Input value={current.nome} onChange={(e) => setForm({ ...current, nome: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={current.email} onChange={(e) => setForm({ ...current, email: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={current.telefone} onChange={(e) => setForm({ ...current, telefone: e.target.value })} />
            </Field>
            <Field label="Nascimento">
              <Input type="date" value={current.nascimento} onChange={(e) => setForm({ ...current, nascimento: e.target.value })} />
            </Field>
            <Field label="Altura (cm)">
              <Input type="number" value={current.altura_cm} onChange={(e) => setForm({ ...current, altura_cm: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)} disabled={!form || saveMut.isPending}>Descartar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form || saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PersonalSelector
        currentPersonalId={current.personal_id}
        currentPersonalNome={current.personal_nome}
        onSelect={(p) => changePersonalMut.mutate(p.id)}
        pending={changePersonalMut.isPending}
      />
    </div>
  );
}

function PersonalSelector({
  currentPersonalId, currentPersonalNome, onSelect, pending,
}: {
  currentPersonalId: string;
  currentPersonalNome: string;
  onSelect: (p: Personal) => void;
  pending: boolean;
}) {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["search-personais", q],
    queryFn: () => apiSearchPersonais(q),
  });
  const results = data?.data ?? [];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Meu Personal</CardTitle>
        <p className="text-xs text-muted-foreground">
          Atual: <strong>{currentPersonalNome}</strong>. Busque outro personal para alterar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, CREF ou e-mail..."
            className="pl-9"
          />
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {results.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">Nenhum personal encontrado.</li>
          )}
          {results.map((p) => {
            const ativo = p.id === currentPersonalId;
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.cref} · {p.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ativo ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Atual
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => onSelect(p)} disabled={pending}>
                      Escolher
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
