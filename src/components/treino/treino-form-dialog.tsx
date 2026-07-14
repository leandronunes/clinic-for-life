import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWorkout, updateWorkout, type Workout } from "@/lib/api/workouts";

export function NovoTreinoDialog({
  alunoId,
  onCreated,
}: {
  alunoId: string;
  onCreated?: (t: Workout) => void;
}) {
  return (
    <TreinoFormDialog
      mode="create"
      alunoId={alunoId}
      onCreated={onCreated}
      trigger={
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo treino
        </Button>
      }
    />
  );
}

export function TreinoFormDialog({
  mode,
  alunoId,
  treino,
  trigger,
  onCreated,
}: {
  mode: "create" | "edit";
  alunoId: string;
  treino?: Workout;
  trigger?: ReactNode;
  onCreated?: (t: Workout) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; focus: string }>({
    title: treino?.title ?? "",
    focus: treino?.focus ?? "",
  });

  const mut = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createWorkout(alunoId, { title: form.title, focus: form.focus })
        : updateWorkout(alunoId, treino!.id, { title: form.title, focus: form.focus }),
    onSuccess: (novo) => {
      toast.success(mode === "create" ? `Treino ${novo.position} cadastrado` : "Treino atualizado");
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      if (mode === "create") {
        setForm({ title: "", focus: "" });
        onCreated?.(novo);
      }
    },
    onError: () =>
      toast.error(
        mode === "create"
          ? "Não foi possível cadastrar o treino"
          : "Não foi possível atualizar o treino",
      ),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && mode === "edit" && treino) setForm({ title: treino.title, focus: treino.focus });
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Cadastrar novo treino" : "Editar treino"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "A posição é atribuída automaticamente conforme a ordem dos treinos ativos."
              : "Atualize o título e o foco deste treino."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Título"
            className="sm:col-span-2"
            labelClassName="text-xs text-muted-foreground"
          >
            <Input
              placeholder="Ex.: Peito, Ombro e Tríceps"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
            />
          </Field>
          <Field
            label="Foco"
            className="sm:col-span-2"
            labelClassName="text-xs text-muted-foreground"
          >
            <Input
              placeholder="Ex.: Empurrar (Push)"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              maxLength={80}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title.trim() || !form.focus.trim()}
          >
            {mut.isPending
              ? "Salvando..."
              : mode === "create"
                ? "Criar treino"
                : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
