import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
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
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Núcleo For Life" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { canWrite } = useAuth();
  const [q, setQ] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">Alunos e personais cadastrados na clínica.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
      </div>

      <Tabs defaultValue="alunos">
        <TabsList>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="personais">Personais</TabsTrigger>
        </TabsList>
        <TabsContent value="alunos" className="mt-4">
          <AlunosTab query={q} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="personais" className="mt-4">
          <PersonaisTab query={q} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlunosTab({ query, canWrite }: { query: string; canWrite: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["alunos"], queryFn: apiListAlunos });
  const { data: personais } = useQuery({ queryKey: ["personais"], queryFn: apiListPersonais });
  const filtered = (data?.data ?? []).filter(
    (a) => a.nome.toLowerCase().includes(query.toLowerCase()) || a.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">{filtered.length} alunos</div>
          {canWrite && (
            <NovoAlunoDialog
              personais={personais?.data ?? []}
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
                <TableHead className="hidden lg:table-cell">Personal</TableHead>
                <TableHead className="hidden sm:table-cell">Altura</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{a.nome}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{a.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{a.email}</TableCell>
                  <TableCell className="hidden lg:table-cell">{a.personal_nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">{a.altura_cm} cm</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "ativo" ? "default" : "secondary"} className={a.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonaisTab({ query, canWrite }: { query: string; canWrite: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["personais"], queryFn: apiListPersonais });
  const filtered = (data?.data ?? []).filter(
    (p) => p.nome.toLowerCase().includes(query.toLowerCase()) || p.cref.toLowerCase().includes(query.toLowerCase()),
  );
  const variantOf = (s: string) =>
    s === "ativo" ? "bg-success text-success-foreground"
      : s === "bloqueado" ? "bg-destructive text-destructive-foreground"
      : "bg-muted text-muted-foreground";

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><div className="font-medium">{p.nome}</div></TableCell>
                  <TableCell className="hidden md:table-cell">{p.cref}</TableCell>
                  <TableCell className="hidden lg:table-cell">{p.email}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.alunos_count}</TableCell>
                  <TableCell><Badge className={variantOf(p.status)}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function NovoAlunoDialog({ personais, onCreated }: { personais: { id: string; nome: string }[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", nascimento: "", sexo: "F" as "F" | "M" | "Outro",
    altura_cm: 170, email: "", telefone: "", personal_id: personais[0]?.id ?? "",
  });
  const mut = useMutation({
    mutationFn: () => apiCreateAluno(form),
    onSuccess: () => {
      toast.success("Aluno cadastrado");
      setOpen(false);
      onCreated();
    },
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
          <Field label="Personal responsável" className="sm:col-span-2">
            <Select value={form.personal_id} onValueChange={(v) => setForm({ ...form, personal_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {personais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="CPF"><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          <Field label="CREF"><Input value={form.cref} onChange={(e) => setForm({ ...form, cref: e.target.value })} /></Field>
          <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
          <Field label="Status" className="sm:col-span-2">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
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

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
