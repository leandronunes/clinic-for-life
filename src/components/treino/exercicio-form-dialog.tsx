import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createExercise,
  updateExercise,
  deleteExercise,
  type Exercise,
  type ExerciseKind,
  type DistanceUnit,
  type HrZone,
  type CreateExercisePayload,
} from "@/lib/api/workouts";
import { patchWorkoutExercises } from "@/lib/workout-cache";
import { KIND_META, secondsToMMSS, mmssToSeconds } from "@/lib/exercise-kind";
import { ExercicioVideoInput } from "@/components/ExercicioVideoInput";

interface ExercicioFormState {
  name: string;
  muscle_group: string;
  sets: number | undefined;
  reps: string;
  load_kg: number | undefined;
  rest_seconds: number | undefined;
  duration_seconds: number;
  distance_value: number | undefined;
  distance_unit: DistanceUnit;
  hr_zone: HrZone | undefined;
  heart_rate_bpm: string;
  video_url: string;
  notes: string;
}

const EMPTY_FORM_BY_KIND: Record<ExerciseKind, ExercicioFormState> = {
  strength: {
    name: "",
    muscle_group: "",
    sets: 3,
    reps: "10-12",
    load_kg: undefined,
    rest_seconds: 60,
    duration_seconds: 0,
    distance_value: undefined,
    distance_unit: "m",
    hr_zone: undefined,
    heart_rate_bpm: "",
    video_url: "",
    notes: "",
  },
  cardio: {
    name: "",
    muscle_group: "",
    sets: 0,
    reps: "",
    load_kg: undefined,
    rest_seconds: 0,
    duration_seconds: 600,
    distance_value: undefined,
    distance_unit: "km",
    hr_zone: undefined,
    heart_rate_bpm: "",
    video_url: "",
    notes: "",
  },
  mobility: {
    name: "",
    muscle_group: "",
    sets: 2,
    reps: "10",
    load_kg: undefined,
    rest_seconds: 0,
    duration_seconds: 0,
    distance_value: undefined,
    distance_unit: "m",
    hr_zone: undefined,
    heart_rate_bpm: "",
    video_url: "",
    notes: "",
  },
};

function formFromExercise(ex: Exercise, kind: ExerciseKind): ExercicioFormState {
  const base = EMPTY_FORM_BY_KIND[kind];
  return {
    name: ex.name,
    muscle_group: ex.muscle_group ?? base.muscle_group,
    sets: ex.sets ?? base.sets,
    reps: ex.reps ?? base.reps,
    load_kg: ex.load_kg ?? undefined,
    rest_seconds: ex.rest_seconds ?? base.rest_seconds,
    duration_seconds: ex.duration_seconds ?? base.duration_seconds,
    distance_value: ex.distance_value ?? undefined,
    distance_unit: ex.distance_unit ?? base.distance_unit,
    hr_zone: ex.hr_zone ?? base.hr_zone,
    heart_rate_bpm: ex.heart_rate_bpm ?? "",
    video_url: ex.video_url,
    notes: ex.notes ?? "",
  };
}

function buildPayload(form: ExercicioFormState, kind: ExerciseKind): CreateExercisePayload {
  const notes = form.notes.trim() ? form.notes : undefined;
  const video_url = form.video_url || undefined;
  if (kind === "strength") {
    return {
      kind,
      name: form.name,
      muscle_group: form.muscle_group,
      sets: form.sets,
      reps: form.reps,
      load_kg: form.load_kg,
      rest_seconds: form.rest_seconds,
      video_url,
      notes,
    };
  }
  if (kind === "mobility") {
    return {
      kind,
      name: form.name,
      sets: form.sets,
      reps: form.reps,
      video_url,
      notes,
    };
  }
  return {
    kind,
    name: form.name,
    duration_seconds: form.duration_seconds || undefined,
    distance_value: form.distance_value,
    distance_unit: form.distance_value ? form.distance_unit : undefined,
    // Explicit null (not undefined) — omitting the key on an update means
    // "don't touch this column" server-side, which would leave a
    // previously-set zone unchanged instead of clearing it.
    hr_zone: form.hr_zone ?? null,
    heart_rate_bpm: form.heart_rate_bpm.trim() || undefined,
    video_url,
    notes,
  };
}

export function ExercicioFormDialog({
  mode,
  kind,
  treinoId,
  alunoId,
  exercicio,
  trigger,
}: {
  mode: "create" | "edit";
  kind: ExerciseKind;
  treinoId: string;
  alunoId: string;
  exercicio?: Exercise;
  trigger?: ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const meta = KIND_META[kind];
  const [form, setForm] = useState<ExercicioFormState>(
    exercicio ? formFromExercise(exercicio, kind) : EMPTY_FORM_BY_KIND[kind],
  );
  // Guards against a double-submit firing two mutations before `mut.isPending`
  // (a React state value) re-renders the disabled button — a plain ref check
  // is synchronous and immune to that race.
  const submittingRef = useRef(false);

  const mut = useMutation({
    mutationFn: () => {
      const payload = buildPayload(form, kind);
      return mode === "create"
        ? createExercise(alunoId, treinoId, payload)
        : updateExercise(alunoId, treinoId, exercicio!.id, payload);
    },
    onSuccess: (savedExercise) => {
      toast.success(
        mode === "create" ? `${meta.label} adicionado(a)` : `${meta.label} atualizado(a)`,
      );
      patchWorkoutExercises(qc, alunoId, treinoId, (exercises) =>
        mode === "create"
          ? [...exercises, savedExercise]
          : exercises.map((e) => (e.id === savedExercise.id ? savedExercise : e)),
      );
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
      setOpen(false);
      if (mode === "create") setForm(EMPTY_FORM_BY_KIND[kind]);
    },
    onError: () =>
      toast.error(
        mode === "create"
          ? `Falha ao adicionar ${meta.label.toLowerCase()}`
          : `Falha ao atualizar ${meta.label.toLowerCase()}`,
      ),
  });

  const canSubmit = (() => {
    if (!form.name.trim()) return false;
    if (kind === "strength") return !!form.muscle_group.trim() && !!form.reps.trim();
    if (kind === "mobility") return !!form.reps.trim() && (form.sets ?? 0) > 0;
    // cardio — precisa ao menos tempo OU distância
    return form.duration_seconds > 0 || (form.distance_value ?? 0) > 0;
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && mode === "edit" && exercicio) setForm(formFromExercise(exercicio, kind));
        if (o && mode === "create") setForm(EMPTY_FORM_BY_KIND[kind]);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full border-dashed", meta.buttonClass)}
          >
            <Plus className="mr-1 h-4 w-4" /> {meta.addLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-w-lg max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? `Adicionar ${meta.label.toLowerCase()}`
              : `Editar ${meta.label.toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>{meta.formHint}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome"
              className="sm:col-span-2"
              labelClassName="text-xs text-muted-foreground"
            >
              <Input
                placeholder={meta.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
              />
            </Field>

            {kind === "strength" && (
              <>
                <Field label="Grupo muscular" labelClassName="text-xs text-muted-foreground">
                  <Input
                    placeholder="Ex.: Peito"
                    value={form.muscle_group}
                    onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
                    maxLength={40}
                  />
                </Field>
                <Field label="Séries" labelClassName="text-xs text-muted-foreground">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.sets ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sets:
                          e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
                <Field
                  label="Repetições"
                  className="sm:col-span-2"
                  labelClassName="text-xs text-muted-foreground"
                >
                  <Input
                    placeholder="Ex.: 10 ou 8-12 ou 45s"
                    value={form.reps}
                    onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  />
                </Field>
                <Field label="Carga (kg)" labelClassName="text-xs text-muted-foreground">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.load_kg ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        load_kg: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Descanso (s)" labelClassName="text-xs text-muted-foreground">
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={form.rest_seconds ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rest_seconds:
                          e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
              </>
            )}

            {kind === "mobility" && (
              <>
                <Field label="Séries" labelClassName="text-xs text-muted-foreground">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.sets ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sets:
                          e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </Field>
                <Field
                  label="Repetições"
                  className="sm:col-span-2"
                  labelClassName="text-xs text-muted-foreground"
                >
                  <Input
                    placeholder="Ex.: 10 ou 30s"
                    value={form.reps}
                    onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  />
                </Field>
              </>
            )}

            {kind === "cardio" && (
              <>
                <Field label="Tempo (mm:ss)" labelClassName="text-xs text-muted-foreground">
                  <Input
                    placeholder="Ex.: 20:00"
                    value={secondsToMMSS(form.duration_seconds)}
                    onChange={(e) =>
                      setForm({ ...form, duration_seconds: mmssToSeconds(e.target.value) })
                    }
                    maxLength={8}
                  />
                </Field>
                <Field label="Distância" labelClassName="text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="Ex.: 5"
                      value={form.distance_value ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          distance_value:
                            e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Select
                      value={form.distance_unit}
                      onValueChange={(v) => setForm({ ...form, distance_unit: v as DistanceUnit })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">metros</SelectItem>
                        <SelectItem value="km">km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
                <Field
                  label="Zona / Intensidade"
                  className="sm:col-span-2"
                  labelClassName="text-xs text-muted-foreground"
                >
                  <Select
                    value={form.hr_zone ? String(form.hr_zone) : "none"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        hr_zone: v === "none" ? undefined : (Number(v) as HrZone),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a zona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="1">Zona 1</SelectItem>
                      <SelectItem value="2">Zona 2</SelectItem>
                      <SelectItem value="3">Zona 3</SelectItem>
                      <SelectItem value="4">Zona 4</SelectItem>
                      <SelectItem value="5">Zona 5</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Frequência cardíaca (bpm)"
                  className="sm:col-span-2"
                  labelClassName="text-xs text-muted-foreground"
                >
                  <Input
                    placeholder="Ex.: 145 ou 133 - 150"
                    value={form.heart_rate_bpm}
                    onChange={(e) => setForm({ ...form, heart_rate_bpm: e.target.value })}
                    maxLength={20}
                  />
                </Field>
              </>
            )}

            <Field
              label="Vídeo de demonstração"
              className="sm:col-span-2"
              labelClassName="text-xs text-muted-foreground"
            >
              <ExercicioVideoInput
                studentId={alunoId}
                value={form.video_url}
                onChange={(url) => setForm({ ...form, video_url: url })}
                onUploadingChange={setVideoUploading}
              />
            </Field>
            <Field
              label="Observação"
              className="sm:col-span-2"
              labelClassName="text-xs text-muted-foreground"
            >
              <Textarea
                placeholder="Dica de execução (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={300}
                rows={2}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (submittingRef.current) return;
              submittingRef.current = true;
              mut.mutate(undefined, {
                onSettled: () => {
                  submittingRef.current = false;
                },
              });
            }}
            disabled={mut.isPending || videoUploading || !canSubmit}
          >
            {videoUploading
              ? "Aguardando vídeo..."
              : mut.isPending
                ? "Salvando..."
                : mode === "create"
                  ? "Adicionar"
                  : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExercicioButton({
  treinoId,
  alunoId,
  exercicio,
}: {
  treinoId: string;
  alunoId: string;
  exercicio: Exercise;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deleteExercise(alunoId, treinoId, exercicio.id),
    onSuccess: () => {
      toast.success("Exercício removido");
      patchWorkoutExercises(qc, alunoId, treinoId, (exercises) =>
        exercises.filter((e) => e.id !== exercicio.id),
      );
      qc.invalidateQueries({ queryKey: ["treinos", alunoId] });
    },
    onError: () => toast.error("Falha ao remover exercício"),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Remover exercício">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover "{exercicio.name}"?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
