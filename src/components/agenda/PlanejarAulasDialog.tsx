import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSchedulePlan } from "@/lib/api/schedules";
import { fetchStudents, type Student } from "@/lib/api/students";
import { expandPlan, WEEKDAY_LABEL_PT } from "@/lib/schedule";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const slotSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  duration_minutes: z.coerce.number().int().min(15, "Mín. 15 min").max(240, "Máx. 240 min"),
});

const schema = z
  .object({
    student_id: z.string().min(1, "Selecione um aluno"),
    starts_on: z.string().min(1, "Informe a data de início"),
    ends_on: z.string().min(1, "Informe a data-fim"),
    notes: z.string().max(500).optional(),
    slots: z.array(slotSchema).length(7),
  })
  .refine((v) => v.slots.some((s) => s.enabled), {
    message: "Selecione pelo menos um dia da semana",
    path: ["slots"],
  })
  .refine((v) => Date.parse(v.starts_on) <= Date.parse(v.ends_on), {
    message: "A data-fim deve ser posterior ou igual à data de início",
    path: ["ends_on"],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  trainerId?: string;
  defaultStudentId?: string;
}

export function PlanejarAulasDialog({ trainerId, defaultStudentId }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ["alunos", trainerId ?? "all"],
    queryFn: () => fetchStudents({ trainerId, status: "active" }),
  });

  const today = new Date();
  const defaultEnds = new Date(today);
  defaultEnds.setMonth(defaultEnds.getMonth() + 2);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id: defaultStudentId ?? "",
      starts_on: isoDate(today),
      ends_on: isoDate(defaultEnds),
      notes: "",
      slots: WEEKDAYS.map((w) => ({
        enabled: false,
        time: "07:00",
        duration_minutes: 60,
      })),
    },
  });

  const values = watch();
  const preview = useMemo(() => {
    if (!values.starts_on || !values.ends_on) return 0;
    const weekdays = values.slots
      .map((s, i) => ({ ...s, weekday: i as 0 | 1 | 2 | 3 | 4 | 5 | 6 }))
      .filter((s) => s.enabled)
      .map((s) => ({ weekday: s.weekday, time: s.time, duration_minutes: s.duration_minutes }));
    if (weekdays.length === 0) return 0;
    return expandPlan(weekdays, values.starts_on, values.ends_on).length;
  }, [values]);

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof createSchedulePlan>[0]) => createSchedulePlan(payload),
    onSuccess: (res) => {
      toast.success(`${res.created} aula(s) criadas com sucesso.`);
      qc.invalidateQueries({ queryKey: ["schedule"] });
      setOpen(false);
      reset();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  function onSubmit(v: FormValues) {
    createMut.mutate({
      student_id: v.student_id,
      starts_on: v.starts_on,
      ends_on: v.ends_on,
      notes: v.notes || null,
      weekdays: v.slots
        .map((s, i) => ({ ...s, weekday: i as 0 | 1 | 2 | 3 | 4 | 5 | 6 }))
        .filter((s) => s.enabled)
        .map((s) => ({ weekday: s.weekday, time: s.time, duration_minutes: s.duration_minutes })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" /> Planejar aulas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Planejar aulas recorrentes</DialogTitle>
          <DialogDescription>
            Defina os dias e horários. As aulas serão criadas semana a semana até a data-fim.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label>Aluno</Label>
            <Controller
              control={control}
              name="student_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s: Student) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.student_id && (
              <p className="text-xs text-destructive">{errors.student_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="starts_on">Início</Label>
              <Input id="starts_on" type="date" {...register("starts_on")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ends_on">Repetir até</Label>
              <Input id="ends_on" type="date" {...register("ends_on")} />
              {errors.ends_on && (
                <p className="text-xs text-destructive">{errors.ends_on.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Dias e horários</Label>
            <div className="mt-2 space-y-2">
              {WEEKDAYS.map((w) => {
                const enabled = values.slots?.[w]?.enabled;
                return (
                  <div
                    key={w}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                  >
                    <Controller
                      control={control}
                      name={`slots.${w}.enabled` as const}
                      render={({ field }) => (
                        <Checkbox
                          id={`slot-${w}`}
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                      )}
                    />
                    <Label htmlFor={`slot-${w}`} className="w-24 text-sm">
                      {WEEKDAY_LABEL_PT[w]}
                    </Label>
                    <Input
                      type="time"
                      className="w-28"
                      disabled={!enabled}
                      {...register(`slots.${w}.time` as const)}
                    />
                    <Input
                      type="number"
                      min={15}
                      max={240}
                      step={5}
                      className="w-20"
                      disabled={!enabled}
                      {...register(`slots.${w}.duration_minutes` as const, { valueAsNumber: true })}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                );
              })}
            </div>
            {errors.slots && (
              <p className="mt-1 text-xs text-destructive">
                {errors.slots.message ?? "Verifique os dias selecionados"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <strong>{preview}</strong> aula(s) serão criadas.
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending || preview === 0}>
              {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar {preview > 0 ? preview : ""} aula(s)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Erro ao criar aulas";
}
