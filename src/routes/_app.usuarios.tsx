import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  apiCreateAluno, apiCreatePersonal, apiListAlunos, apiListPersonais,
  apiUpdateAluno, apiUpdatePersonal,
  type Aluno, type Personal,
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Núcleo For Life" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { user, canWrite, hasRole } = useAuth();
  const [q, setQ] = useState("");
  const isPersonal = hasRole("personal");
  const isAdmin = hasRole("admin");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {isPersonal ? "Meus Alunos" : "Gestão de Usuários"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPersonal
              ? "Alunos sob sua orientação. Clique em um aluno para ver detalhes."
              : "Alunos e personais cadastrados na clínica."}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="alunos">
          <TabsList>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            <TabsTrigger value="personais">Personais</TabsTrigger>
          </TabsList>
          <TabsContent value="alunos" className="mt-4">
            <AlunosTab query={q} canWrite={canWrite} isAdmin />
          </TabsContent>
          <TabsContent value="personais" className="mt-4">
            <PersonaisTab query={q} canWrite={canWrite} />
          </TabsContent>
        </Tabs>
      ) : (
        <AlunosTab query={q} canWrite={canWrite} personalId={user?.personal_id} isAdmin={false} />
      )}
    </div>
  );
}

function AlunosTab({
  query, canWrite, personalId, isAdmin,
}: { query: string; canWrite: boolean; personalId?: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { impersonateAluno } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["alunos", personalId ?? "all"],
    queryFn: () => apiListAlunos(personalId ? { personalId } : undefined),
  });
  const { data: personais } = useQuery({ queryKey: ["personais"], queryFn: apiListPersonais });
  const filtered = (data?.data ?? []).filter(
    (a: Aluno) =>
      a.nome.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase()),
  );
  const [editing, setEditing] = useState<Aluno | null>(null);

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">{filtered.length} alunos</div>
          {canWrite && (
            <NovoAlunoDialog
              personais={personais?.data ?? []}
              lockedPersonalId={personalId}
              onCreated={() => qc.invalidateQueries({ queryKey: ["alunos"] })}
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                {isAdmin && <TableHead className="hidden lg:table-cell">Personal</TableHead>}
                <TableHead className="hidden sm:table-cell">Altura</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map((a: Aluno) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => {
                    impersonateAluno(a.id);
                    navigate({ to: "/aluno" });
                  }}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{a.nome}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{a.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{a.email}</TableCell>
                  {isAdmin && <TableCell className="hidden lg:table-cell">{a.personal_nome}</TableCell>}
                  <TableCell className="hidden sm:table-cell">{a.altura_cm} cm</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "ativo" ? "default" : "secondary"} className={a.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <EditAlunoDialog
          aluno={editing}
          personais={personais?.data ?? []}
          canChangePersonal={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["alunos"] }); }}
        />
      )}
    </Card>
  );
}

function PersonaisTab({ query, canWrite }: { query: string; canWrite: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["personais"], queryFn: apiListPersonais });
  const filtered = (data?.data ?? []).filter(
    (p: Personal) => p.nome.toLowerCase().includes(query.toLowerCase()) || p.cref.toLowerCase().includes(query.toLowerCase()),
  );
  const variantOf = (s: string) =>
    s === "ativo" ? "bg-success text-success-foreground"
      : s === "bloqueado" ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";
  const [editing, setEditing] = useState<Personal | null>(null);

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">{filtered.length} personais</div>
          {canWrite && <NovoPersonalDialog onCreated={() => qc.invalidateQueries({ queryKey: ["personais"] })} />}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CREF</TableHead>
                <TableHead className="hidden lg:table-cell">E-mail</TableHead>
                <TableHead className="hidden sm:table-cell">Alunos</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="w-24 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map((p: Personal) => (
                <TableRow key={p.id}>
                  <TableCell><div className="font-medium">{p.nome}</div></TableCell>
                  <TableCell className="hidden md:table-cell">{p.cref}</TableCell>
                  <TableCell className="hidden lg:table-cell">{p.email}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.alunos_count}</TableCell>
                  <TableCell><Badge className={variantOf(p.status)}>{p.status}</Badge></TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <EditPersonalDialog
          personal={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["personais"] }); }}
        />
      )}
    </Card>
  );
}

function NovoAlunoDialog({
  personais, lockedPersonalId, onCreated,
}: { personais: Personal[]; lockedPersonalId?: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", nascimento: "", sexo: "F" as "F" | "M" | "Outro",
    altura_cm: 170, email: "", telefone: "",
    personal_id: lockedPersonalId ?? personais[0]?.id ?? "",
  });
  const mut = useMutation({
    mutationFn: () => apiCreateAluno({ ...form, personal_id: lockedPersonalId ?? form.personal_id }),
    onSuccess: () => { toast.success("Aluno cadastrado"); setOpen(false); onCreated(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo aluno</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar aluno</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
          </Field>
          <Field label="Sexo">
            <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as "F" | "M" | "Outro" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Feminino</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Altura (cm)">
            <Input type="number" value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: Number(e.target.value) })} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          {!lockedPersonalId && (
            <Field label="Personal responsável" className="sm:col-span-2">
              <Select value={form.personal_id} onValueChange={(v) => setForm({ ...form, personal_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {personais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {lockedPersonalId && (
            <div className="sm:col-span-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Este aluno será automaticamente associado ao seu cadastro de personal.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome || !form.email}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAlunoDialog({
  aluno, personais, canChangePersonal, onClose, onSaved,
}: {
  aluno: Aluno;
  personais: Personal[];
  canChangePersonal: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Aluno>(aluno);
  const mut = useMutation({
    mutationFn: () => apiUpdateAluno(aluno.id, {
      nome: form.nome, email: form.email, telefone: form.telefone,
      altura_cm: form.altura_cm, sexo: form.sexo, nascimento: form.nascimento,
      status: form.status,
      ...(canChangePersonal ? { personal_id: form.personal_id } : {}),
    }),
    onSuccess: () => { toast.success("Aluno atualizado"); onSaved(); },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Nascimento">
            <Input type="date" value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
          </Field>
          <Field label="Sexo">
            <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as Aluno["sexo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Feminino</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Altura (cm)">
            <Input type="number" value={form.altura_cm} onChange={(e) => setForm({ ...form, altura_cm: Number(e.target.value) })} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Aluno["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {canChangePersonal && (
            <Field label="Personal responsável">
              <Select value={form.personal_id} onValueChange={(v) => setForm({ ...form, personal_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {personais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoPersonalDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", cpf: "", cref: "", email: "", telefone: "",
    status: "ativo" as "ativo" | "bloqueado" | "inativo",
  });
  const mut = useMutation({
    mutationFn: () => apiCreatePersonal(form),
    onSuccess: () => { toast.success("Personal cadastrado"); setOpen(false); onCreated(); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo personal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar personal</DialogTitle></DialogHeader>
        <PersonalFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.nome || !form.cref}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPersonalDialog({
  personal, onClose, onSaved,
}: { personal: Personal; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: personal.nome, cpf: personal.cpf, cref: personal.cref, email: personal.email,
    telefone: personal.telefone, status: personal.status,
  });
  const mut = useMutation({
    mutationFn: () => apiUpdatePersonal(personal.id, form),
    onSuccess: () => { toast.success("Personal atualizado"); onSaved(); },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar personal</DialogTitle></DialogHeader>
        <PersonalFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PersonalFormState = {
  nome: string; cpf: string; cref: string; email: string; telefone: string;
  status: "ativo" | "bloqueado" | "inativo";
};

function PersonalFormFields({
  form, setForm,
}: { form: PersonalFormState; setForm: (f: PersonalFormState) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome" className="sm:col-span-2">
        <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      </Field>
      <Field label="CPF"><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
      <Field label="CREF"><Input value={form.cref} onChange={(e) => setForm({ ...form, cref: e.target.value })} /></Field>
      <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Telefone"><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
      <Field label="Status" className="sm:col-span-2">
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PersonalFormState["status"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
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
