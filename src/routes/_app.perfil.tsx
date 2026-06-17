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
import { fetchStudent, updateStudent, type Student } from "@/lib/api/students";
import { fetchTrainers, type Trainer } from "@/lib/api/trainers";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";


export const Route = createFileRoute("/_app/perfil")({
  component: PerfilPage,
});


function PerfilPage() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();

  if (!hasRole("aluno") || !user?.aluno_id) return <Navigate to="/dashboard" />;

  const { data: student, isLoading } = useQuery({
    queryKey: ["aluno", user.aluno_id],
    queryFn: () => fetchStudent(user.aluno_id!),
  });

  const [form, setForm] = useState<Student | null>(null);
  const current = form ?? student ?? null;

  const saveMut = useMutation({
    mutationFn: () =>
      updateStudent(user.aluno_id!, {
        name: current!.name,
        email: current!.email,
        phone: current!.phone,
        sex: current!.sex,
        birth_date: current!.birth_date,
        health_plan: current!.health_plan,
        emergency_contact: current!.emergency_contact,
      }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["aluno", user.aluno_id] });
    },
  });

  const changePersonalMut = useMutation({
    mutationFn: (trainerId: string) => updateStudent(user.aluno_id!, { trainer_id: trainerId }),
    onSuccess: (res) => {
      toast.success(`Personal alterado para ${res.trainer_name}`);
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
              <Input value={current.name} onChange={(e) => setForm({ ...current, name: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={current.email} onChange={(e) => setForm({ ...current, email: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={current.phone} onChange={(e) => setForm({ ...current, phone: e.target.value })} />
            </Field>
            <Field label="Nascimento">
              <Input type="date" value={current.birth_date} onChange={(e) => setForm({ ...current, birth_date: e.target.value })} />
            </Field>
            <Field label="Gênero">
              <Select
                value={current.sex}
                onValueChange={(v) => setForm({ ...current, sex: v as Student["sex"] })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Plano de Saúde" className="sm:col-span-2">
              <Input
                value={current.health_plan ?? ""}
                onChange={(e) => setForm({ ...current, health_plan: e.target.value })}
                placeholder="Ex.: Unimed, Bradesco Saúde..."
              />
            </Field>
            <Field label="Contato de Emergência" className="sm:col-span-2">
              <Input
                value={current.emergency_contact ?? ""}
                onChange={(e) => setForm({ ...current, emergency_contact: e.target.value })}
                placeholder="Nome e telefone"
              />
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
        currentTrainerId={current.trainer_id}
        currentTrainerName={current.trainer_name}
        onSelect={(t) => changePersonalMut.mutate(t.id)}
        pending={changePersonalMut.isPending}
      />
    </div>
  );
}

function PersonalSelector({
  currentTrainerId, currentTrainerName, onSelect, pending,
}: {
  currentTrainerId: string;
  currentTrainerName: string;
  onSelect: (t: Trainer) => void;
  pending: boolean;
}) {
  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["search-trainers", q],
    queryFn: () => fetchTrainers(q),
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Meu Personal</CardTitle>
        <p className="text-xs text-muted-foreground">
          Atual: <strong>{currentTrainerName}</strong>. Busque outro personal para alterar.
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
            const ativo = p.id === currentTrainerId;
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium">{p.name}</div>
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
