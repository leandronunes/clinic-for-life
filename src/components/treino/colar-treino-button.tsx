import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWorkout, createExercise, type Workout } from "@/lib/api/workouts";
import {
  useWorkoutClipboard,
  toCreateExercisePayload,
  type WorkoutClipboard,
} from "@/hooks/use-workout-clipboard";

export function ColarTreinoButton({
  alunoId,
  onPasted,
}: {
  alunoId: string;
  onPasted?: (t: Workout) => void;
}) {
  const { clipboard, clear } = useWorkoutClipboard();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");

  useEffect(() => {
    if (open && clipboard) {
      setTitle(clipboard.title);
      setFocus(clipboard.focus);
    }
  }, [open, clipboard]);

  const pasteMut = useMutation({
    mutationFn: async (payload: { clip: WorkoutClipboard; title: string; focus: string }) => {
      const workout = await createWorkout(alunoId, {
        title: payload.title,
        focus: payload.focus,
      });
      // Sequenciar as criações de exercícios preserva a ordem original (position).
      for (const ex of payload.clip.exercises) {
        await createExercise(alunoId, workout.id, toCreateExercisePayload(ex));
      }
      return workout;
    },
    onSuccess: (workout) => {
      toast.success(`Treino colado com ${clipboard?.exercises.length ?? 0} exercícios`);
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      onPasted?.(workout);
    },
    onError: () =>
      toast.error(
        "Não foi possível colar o treino. Verifique se todos os exercícios foram criados.",
      ),
  });

  if (!clipboard) return null;

  const isSameAluno = clipboard.sourceStudentId === alunoId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1">
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-2 text-primary">
            <ClipboardPaste className="h-4 w-4" />
            Colar treino
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {clipboard.exercises.length} ex.
            </Badge>
          </Button>
        </DialogTrigger>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Limpar treino copiado"
          onClick={clear}
          className="h-7 w-7"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Colar treino no aluno</DialogTitle>
          <DialogDescription>
            {isSameAluno
              ? "Este treino foi copiado deste mesmo aluno — será duplicado como um novo treino."
              : "Um novo treino será criado neste aluno com todos os exercícios copiados. Você pode ajustar carga, repetições e observações depois."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="font-medium">Origem: {clipboard.title}</div>
          <div className="text-xs text-muted-foreground">
            Foco: {clipboard.focus} · {clipboard.exercises.length} exercícios
          </div>
        </div>
        <div className="grid gap-3">
          <Field label="Novo título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Novo foco">
            <Input value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={80} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              pasteMut.mutate({ clip: clipboard, title: title.trim(), focus: focus.trim() })
            }
            disabled={!title.trim() || !focus.trim() || pasteMut.isPending}
          >
            {pasteMut.isPending ? "Colando..." : "Colar treino"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
