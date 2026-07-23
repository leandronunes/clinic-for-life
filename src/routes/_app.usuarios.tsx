import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  requestStudentMigration,
  toBackendSex,
  fromBackendSex,
  type Student,
} from "@/lib/api/students";
import type { ApiError } from "@/lib/api/http";
import {
  fetchTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  approveTrainer,
  rejectTrainer,
  type Trainer,
} from "@/lib/api/trainers";
import { useAuth } from "@/contexts/use-auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/usuarios")({
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
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="alunos">
          <TabsList>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            <TabsTrigger value="personais">Personais</TabsTrigger>
          </TabsList>
          <TabsContent value="alunos" className="mt-4">
            <AlunosTab query={q} canWrite={canWrite} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="personais" className="mt-4">
            <PersonaisTab query={q} canWrite={canWrite} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      ) : (
        <AlunosTab
          query={q}
          canWrite={canWrite}
          personalId={user?.personal_id ?? undefined}
          isAdmin={false}
        />
      )}
    </div>
  );
}

function AlunosTab({
  query,
  canWrite,
  personalId,
  isAdmin,
}: {
  query: string;
  canWrite: boolean;
  personalId?: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { impersonateAluno } = useAuth();
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["alunos", personalId ?? "all"],
    queryFn: () => fetchStudents(personalId ? { trainerId: personalId } : undefined),
  });
  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: () => fetchTrainers(),
  });
  const filtered = students.filter(
    (a: Student) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase()),
  );
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      toast.success("Aluno removido permanentemente.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["alunos"] });
    },
    onError: () => toast.error("Falha ao remover aluno."),
  });

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="text-sm text-muted-foreground">{filtered.length} alunos</div>
          {canWrite && (
            <NovoAlunoDialog
              trainers={trainers}
              lockedPersonalId={personalId}
              isAdmin={isAdmin}
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
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="w-28 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a: Student) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      impersonateAluno(a.id);
                      navigate({ to: "/aluno" });
                    }}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{a.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{a.email}</div>
                      {isAdmin && (
                        <div className="text-xs text-muted-foreground lg:hidden">
                          Personal: {a.trainer_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{a.email}</TableCell>
                    {isAdmin && (
                      <TableCell className="hidden lg:table-cell">{a.trainer_name}</TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={a.status === "active" ? "default" : "secondary"}
                        className={
                          a.status === "active" ? "bg-success text-success-foreground" : ""
                        }
                      >
                        {a.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <EditAlunoDialog
          student={editing}
          trainers={trainers}
          canChangePersonal={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["alunos"] });
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aluno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno <strong>{deleting?.name}</strong> e todos os seus dados serão removidos
              permanentemente — incluindo imagens de avaliação biomecânica, fotos de evolução,
              exames e demais arquivos armazenados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
            >
              {deleteMut.isPending ? "Removendo…" : "Remover permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PersonaisTab({
  query,
  canWrite,
  isAdmin,
}: {
  query: string;
  canWrite: boolean;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const { data: trainers = [], isLoading } = useQuery({
    queryKey: ["trainers"],
    queryFn: () => fetchTrainers(),
  });
  const filtered = trainers.filter(
    (p: Trainer) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.cref.toLowerCase().includes(query.toLowerCase()),
  );
  const variantOf = (s: string) =>
    s === "active"
      ? "bg-success text-success-foreground"
      : s === "blocked"
        ? "bg-destructive text-destructive-foreground"
        : "bg-muted text-muted-foreground";
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [deleting, setDeleting] = useState<Trainer | null>(null);
  const [rejecting, setRejecting] = useState<Trainer | null>(null);
  const pendingCount = trainers.filter((p: Trainer) => !p.approved_at).length;

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTrainer(id),
    onSuccess: () => {
      toast.success("Personal removido permanentemente.");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["trainers"] });
    },
    onError: () => toast.error("Falha ao remover personal."),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveTrainer(id),
    onSuccess: () => {
      toast.success("Personal aprovado — já faz parte da organização.");
      qc.invalidateQueries({ queryKey: ["trainers"] });
    },
    onError: () => toast.error("Falha ao aprovar personal."),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectTrainer(id),
    onSuccess: () => {
      toast.success("Pedido rejeitado.");
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ["trainers"] });
    },
    onError: () => toast.error("Falha ao rejeitar pedido."),
  });

  return (
    <Card className="shadow-soft">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {filtered.length} personais
            {isAdmin && pendingCount > 0 && (
              <Badge className="bg-warning text-warning-foreground">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""} de aprovação
              </Badge>
            )}
          </div>
          {canWrite && (
            <NovoPersonalDialog
              onCreated={() => qc.invalidateQueries({ queryKey: ["trainers"] })}
            />
          )}
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
                {canWrite && <TableHead className="w-28 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p: Trainer) => {
                  const isPending = isAdmin && !p.approved_at;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {p.students_count} alunos
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{p.cref}</TableCell>
                      <TableCell className="hidden lg:table-cell">{p.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.students_count}</TableCell>
                      <TableCell>
                        {isPending ? (
                          <Badge className="bg-warning text-warning-foreground">Pendente</Badge>
                        ) : (
                          <Badge className={variantOf(p.status)}>{p.status}</Badge>
                        )}
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          {isPending ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-success hover:text-success"
                                aria-label={`Aprovar ${p.name}`}
                                disabled={approveMut.isPending}
                                onClick={() => approveMut.mutate(p.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Rejeitar ${p.name}`}
                                onClick={() => setRejecting(p)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleting(p)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {editing && (
        <EditPersonalDialog
          trainer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["trainers"] });
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover personal permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O personal <strong>{deleting?.name}</strong> será removido permanentemente.
              {deleting && deleting.students_count > 0 && (
                <span className="mt-2 block rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                  Atenção: este personal possui <strong>{deleting.students_count} aluno(s)</strong>{" "}
                  associado(s). Os alunos perderão o vínculo mas seus dados serão mantidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
            >
              {deleteMut.isPending ? "Removendo…" : "Remover permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar pedido de entrada na organização?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido de <strong>{rejecting?.name}</strong> será rejeitado e a conta removida
              permanentemente. Esta ação não pode ser desfeita — a pessoa precisará se cadastrar
              novamente do zero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={rejectMut.isPending}
              onClick={() => rejecting && rejectMut.mutate(rejecting.id)}
            >
              {rejectMut.isPending ? "Rejeitando…" : "Rejeitar e remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function NovoAlunoDialog({
  trainers,
  lockedPersonalId,
  isAdmin,
  onCreated,
}: {
  trainers: Trainer[];
  lockedPersonalId?: string;
  isAdmin: boolean;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [crossOrgEmail, setCrossOrgEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    birth_date: "",
    sex: "female" as Student["sex"],
    email: "",
    phone: "",
    trainer_id: lockedPersonalId ?? trainers[0]?.id ?? "",
    contracted_workouts_per_cycle: "" as string,
  });
  const mut = useMutation({
    mutationFn: () =>
      createStudent({
        ...form,
        trainer_id: lockedPersonalId ?? form.trainer_id,
        contracted_workouts_per_cycle: form.contracted_workouts_per_cycle
          ? Number(form.contracted_workouts_per_cycle)
          : null,
      }),
    onSuccess: () => {
      toast.success("Aluno cadastrado");
      setOpen(false);
      onCreated();
    },
    onError: (error: ApiError) => {
      if (error.code === "email_taken_same_organization") {
        toast.error("Já existe um aluno cadastrado com este e-mail nesta organização.");
        return;
      }
      if (error.code === "email_taken_other_organization") {
        if (isAdmin) {
          setCrossOrgEmail(form.email);
        } else {
          toast.error(
            "Este e-mail já está cadastrado em outra organização. Peça a um admin para solicitar a migração.",
          );
        }
        return;
      }
      toast.error(error.message || "Falha ao cadastrar aluno.");
    },
  });

  const migrationMut = useMutation({
    mutationFn: (email: string) => requestStudentMigration(email),
    onSuccess: () => {
      toast.success("Solicitação de migração enviada — o aluno foi notificado.");
      setCrossOrgEmail(null);
      setOpen(false);
    },
    onError: () => toast.error("Falha ao solicitar a migração."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar aluno</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Nascimento">
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </Field>
          <Field label="Sexo">
            <Select
              value={form.sex}
              onValueChange={(v) => setForm({ ...form, sex: v as Student["sex"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          {isFeatureEnabled("attendanceCycles") && (
            <Field label="Treinos contratados por ciclo">
              <Input
                type="number"
                min={1}
                placeholder="Ex.: 12"
                value={form.contracted_workouts_per_cycle}
                onChange={(e) =>
                  setForm({ ...form, contracted_workouts_per_cycle: e.target.value })
                }
              />
            </Field>
          )}

          {!lockedPersonalId && (
            <Field label="Personal responsável" className="sm:col-span-2">
              <Select
                value={form.trainer_id}
                onValueChange={(v) => setForm({ ...form, trainer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
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
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name || !form.email}
          >
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={!!crossOrgEmail} onOpenChange={(o) => !o && setCrossOrgEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-mail já cadastrado em outra organização</AlertDialogTitle>
            <AlertDialogDescription>
              O e-mail <strong>{crossOrgEmail}</strong> já pertence a um aluno de outra organização.
              Deseja solicitar a migração desse aluno para a sua organização? Ele receberá um
              convite e poderá aceitar ou recusar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={migrationMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={migrationMut.isPending}
              onClick={() => crossOrgEmail && migrationMut.mutate(crossOrgEmail)}
            >
              {migrationMut.isPending ? "Enviando..." : "Solicitar migração"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function EditAlunoDialog({
  student,
  trainers,
  canChangePersonal,
  onClose,
  onSaved,
}: {
  student: Student;
  trainers: Trainer[];
  canChangePersonal: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Student>(student);
  const mut = useMutation({
    mutationFn: () => {
      const prevQuota = student.contracted_workouts_per_cycle ?? null;
      const nextQuota = form.contracted_workouts_per_cycle ?? null;
      const quotaChanged = prevQuota !== nextQuota;
      return updateStudent(student.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        sex: form.sex,
        birth_date: form.birth_date,
        status: form.status,
        contracted_workouts_per_cycle: nextQuota,
        // Ao definir uma nova quota (ou alterar), o ciclo recomeça agora.
        ...(quotaChanged && nextQuota
          ? { cycle_started_at: new Date().toISOString() }
          : quotaChanged && !nextQuota
            ? { cycle_started_at: null }
            : {}),
        ...(canChangePersonal
          ? { trainer_id: form.trainer_id, partner_card_enabled: form.partner_card_enabled }
          : {}),
      });
    },
    onSuccess: () => {
      toast.success("Aluno atualizado");
      onSaved();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar aluno</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Nascimento">
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </Field>
          <Field label="Sexo">
            <Select
              value={form.sex}
              onValueChange={(v) => setForm({ ...form, sex: v as Student["sex"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as Student["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {isFeatureEnabled("attendanceCycles") && (
            <Field label="Treinos contratados por ciclo">
              <Input
                type="number"
                min={1}
                placeholder="Ex.: 12"
                value={form.contracted_workouts_per_cycle ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contracted_workouts_per_cycle: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          )}

          {canChangePersonal && (
            <Field label="Personal responsável">
              <Select
                value={form.trainer_id}
                onValueChange={(v) => setForm({ ...form, trainer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {canChangePersonal && (
            <Field label="Cartão de parceiros" className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <Switch
                  aria-label="Cartão de parceiros"
                  checked={form.partner_card_enabled}
                  onCheckedChange={(v) => setForm({ ...form, partner_card_enabled: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {form.partner_card_enabled ? "Ativo" : "Desativado"}
                </span>
              </div>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
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
    name: "",
    cpf: "",
    cref: "",
    email: "",
    phone: "",
    status: "active" as "active" | "blocked" | "inactive",
  });
  const mut = useMutation({
    mutationFn: () => createTrainer(form),
    onSuccess: () => {
      toast.success("Personal cadastrado");
      setOpen(false);
      onCreated();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo personal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar personal</DialogTitle>
        </DialogHeader>
        <PersonalFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.name}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPersonalDialog({
  trainer,
  onClose,
  onSaved,
}: {
  trainer: Trainer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: trainer.name,
    cpf: trainer.cpf,
    cref: trainer.cref,
    email: trainer.email,
    phone: trainer.phone,
    status: trainer.status,
  });
  const mut = useMutation({
    mutationFn: () => updateTrainer(trainer.id, form),
    onSuccess: () => {
      toast.success("Personal atualizado");
      onSaved();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar personal</DialogTitle>
        </DialogHeader>
        <PersonalFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PersonalFormState = {
  name: string;
  cpf: string;
  cref: string;
  email: string;
  phone: string;
  status: "active" | "blocked" | "inactive";
};

function PersonalFormFields({
  form,
  setForm,
}: {
  form: PersonalFormState;
  setForm: (f: PersonalFormState) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome" className="sm:col-span-2">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="CPF (opcional)">
        <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
      </Field>
      <Field label="CREF (opcional)">
        <Input value={form.cref} onChange={(e) => setForm({ ...form, cref: e.target.value })} />
      </Field>
      <Field label="E-mail">
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <Field label="Telefone">
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="Status" className="sm:col-span-2">
        <Select
          value={form.status}
          onValueChange={(v) => setForm({ ...form, status: v as PersonalFormState["status"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
