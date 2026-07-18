import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Dumbbell,
  Loader2,
  Pencil,
  Smile,
  Trash2,
} from "lucide-react";
import EmojiPicker, { EmojiStyle, type EmojiClickData } from "emoji-picker-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  fetchCompletedCheckIns,
  markCheckInViewed,
  claimCheckIn,
  type WorkoutCheckIn,
} from "@/lib/api/check-ins";
import {
  checkInEffectiveDate,
  formatCheckInDateTime,
  checkInCompletionPercentage,
} from "@/lib/check-in-format";
import {
  createCheckInFeedback,
  updateCheckInFeedback,
  deleteCheckInFeedback,
  type CheckInFeedback,
} from "@/lib/api/check-in-feedbacks";
import { PseScale } from "@/components/treino/pse-scale";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/treinos-concluidos")({
  head: () =>
    pageHead({
      path: "/treinos-concluidos",
      title: "Treinos Concluídos — Núcleo For Life",
      description: "Revise os treinos concluídos pelos seus alunos e envie feedback.",
    }),
  component: TreinosConcluidosPage,
});

// O que importa para o personal é se o treino já recebeu feedback — se foi
// só "visualizado" sem resposta, ainda conta como pendente. "Novo" (nunca
// aberto) é só um selo secundário dentro do grupo pendente, não o estado
// dominante.
function needsFeedback(checkIn: WorkoutCheckIn): boolean {
  return checkIn.feedbacks.length === 0;
}

function checkInTimestamp(checkIn: WorkoutCheckIn): number {
  return checkInEffectiveDate(checkIn).getTime();
}

interface StudentSummary {
  student_id: string;
  student_name: string;
  total: number;
  pending: number;
}

function summarizeByStudent(checkIns: WorkoutCheckIn[]): StudentSummary[] {
  const byStudent = new Map<string, StudentSummary>();
  for (const checkIn of checkIns) {
    const existing = byStudent.get(checkIn.student_id);
    if (existing) {
      existing.total += 1;
      if (needsFeedback(checkIn)) existing.pending += 1;
    } else {
      byStudent.set(checkIn.student_id, {
        student_id: checkIn.student_id,
        student_name: checkIn.student_name,
        total: 1,
        pending: needsFeedback(checkIn) ? 1 : 0,
      });
    }
  }
  return [...byStudent.values()].sort(
    (a, b) =>
      b.pending - a.pending || b.total - a.total || a.student_name.localeCompare(b.student_name),
  );
}

export function TreinosConcluidosPage() {
  const qc = useQueryClient();
  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ["completed-check-ins"],
    queryFn: fetchCompletedCheckIns,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStudentId, setFilterStudentId] = useState<string | null>(null);
  const [answeredOpen, setAnsweredOpen] = useState(false);
  const selected = checkIns.find((c) => c.id === selectedId) ?? null;

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["completed-check-ins"] }),
    [qc],
  );

  const studentSummaries = useMemo(() => summarizeByStudent(checkIns), [checkIns]);

  const visibleCheckIns = filterStudentId
    ? checkIns.filter((c) => c.student_id === filterStudentId)
    : checkIns;

  const pending = useMemo(
    () =>
      visibleCheckIns
        .filter(needsFeedback)
        .sort((a, b) => checkInTimestamp(a) - checkInTimestamp(b)),
    [visibleCheckIns],
  );
  const answered = useMemo(
    () =>
      visibleCheckIns
        .filter((c) => !needsFeedback(c))
        .sort((a, b) => checkInTimestamp(b) - checkInTimestamp(a)),
    [visibleCheckIns],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Treinos Concluídos</h1>
        <p className="text-sm text-muted-foreground">
          Revise os treinos concluídos pelos seus alunos e envie um feedback ou reação.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : checkIns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum treino concluído ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <StudentSummaryStrip
            summaries={studentSummaries}
            selectedId={filterStudentId}
            onSelect={(id) => setFilterStudentId((cur) => (cur === id ? null : id))}
          />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Aguardando feedback ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Tudo em dia! Nenhum treino aguardando feedback.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((checkIn) => (
                  <CheckInCard
                    key={checkIn.id}
                    checkIn={checkIn}
                    emphasized
                    onClick={() => setSelectedId(checkIn.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {answered.length > 0 && (
            <Collapsible open={answeredOpen} onOpenChange={setAnsweredOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", answeredOpen && "rotate-180")}
                  />
                  Já respondido ({answered.length})
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {answered.map((checkIn) => (
                    <CheckInCard
                      key={checkIn.id}
                      checkIn={checkIn}
                      onClick={() => setSelectedId(checkIn.id)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      <CheckInReviewDialog
        checkIn={selected}
        onClose={() => setSelectedId(null)}
        onChanged={invalidate}
      />
    </div>
  );
}

function StudentSummaryStrip({
  summaries,
  selectedId,
  onSelect,
}: {
  summaries: StudentSummary[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {summaries.map((summary) => {
        const active = summary.student_id === selectedId;
        return (
          <button
            key={summary.student_id}
            type="button"
            onClick={() => onSelect(summary.student_id)}
            aria-pressed={active}
            aria-label={`Filtrar por ${summary.student_name}`}
            className={cn(
              "flex shrink-0 flex-col items-start gap-1 rounded-lg border p-3 text-left transition hover:border-primary",
              active && "border-primary bg-primary/5",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-medium">{summary.student_name}</span>
              {summary.pending > 0 && <Badge>{summary.pending} aguardando</Badge>}
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.total} {summary.total === 1 ? "treino concluído" : "treinos concluídos"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CheckInCard({
  checkIn,
  emphasized = false,
  onClick,
}: {
  checkIn: WorkoutCheckIn;
  emphasized?: boolean;
  onClick: () => void;
}) {
  const isNew = !checkIn.viewed_at;
  const hasFeedback = checkIn.feedbacks.length > 0;
  const date = checkInEffectiveDate(checkIn);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${checkIn.student_name} — ${checkIn.workout_title}`}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 text-left transition hover:border-primary",
        emphasized && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{checkIn.student_name}</div>
          <div className="text-sm text-muted-foreground">{checkIn.workout_title}</div>
        </div>
        {checkIn.performed_by === "aluno" && <Badge variant="outline">Feito pelo aluno</Badge>}
        {isNew && <Badge>Novo</Badge>}
        {hasFeedback && (
          <span className="text-lg" aria-label="Feedback enviado">
            {checkIn.feedbacks.find((f) => f.emoji)?.emoji ?? "💬"}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatCheckInDateTime(date)} · {checkIn.exercises_completed}/{checkIn.exercises_total}{" "}
        exercícios
      </p>
    </button>
  );
}

function CheckInReviewDialog({
  checkIn,
  onClose,
  onChanged,
}: {
  checkIn: WorkoutCheckIn | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmoji, setEditEmoji] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editEmojiOpen, setEditEmojiOpen] = useState(false);

  useEffect(() => {
    if (!checkIn || checkIn.viewed_at) return;
    let cancelled = false;
    markCheckInViewed(checkIn.student_id, checkIn.workout_id, checkIn.id).then(() => {
      if (!cancelled) onChanged();
    });
    return () => {
      cancelled = true;
    };
  }, [checkIn, onChanged]);

  const feedbackMut = useMutation({
    mutationFn: (message: string) => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return createCheckInFeedback(checkIn.student_id, checkIn.workout_id, checkIn.id, {
        message,
      });
    },
    onSuccess: () => {
      toast.success("Feedback enviado");
      setMessage("");
      onChanged();
    },
    onError: () => toast.error("Não foi possível enviar o feedback"),
  });

  const reactionMut = useMutation({
    mutationFn: (emoji: string) => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return createCheckInFeedback(checkIn.student_id, checkIn.workout_id, checkIn.id, { emoji });
    },
    onSuccess: () => {
      toast.success("Reação enviada");
      setEmojiOpen(false);
      onChanged();
    },
    onError: () => toast.error("Não foi possível enviar a reação"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { feedbackId: string; emoji: string | null; message: string }) => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return updateCheckInFeedback(
        checkIn.student_id,
        checkIn.workout_id,
        checkIn.id,
        vars.feedbackId,
        {
          ...(vars.emoji !== null ? { emoji: vars.emoji } : { emoji: null }),
          message: vars.message.trim() || undefined,
        },
      );
    },
    onSuccess: () => {
      toast.success("Feedback atualizado");
      setEditingId(null);
      onChanged();
    },
    onError: () => toast.error("Não foi possível atualizar o feedback"),
  });

  const deleteMut = useMutation({
    mutationFn: (feedbackId: string) => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return deleteCheckInFeedback(checkIn.student_id, checkIn.workout_id, checkIn.id, feedbackId);
    },
    onSuccess: () => {
      toast.success("Feedback removido");
      onChanged();
    },
    onError: () => toast.error("Não foi possível remover o feedback"),
  });

  const claimMut = useMutation({
    mutationFn: () => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return claimCheckIn(checkIn.student_id, checkIn.workout_id, checkIn.id);
    },
    onSuccess: () => {
      toast.success("Check-in confirmado — agora conta no ciclo de atendimento");
      onChanged();
    },
    onError: () => toast.error("Não foi possível confirmar o check-in"),
  });

  function startEdit(fb: CheckInFeedback) {
    setEditingId(fb.id);
    setEditEmoji(fb.emoji);
    setEditMessage(fb.message ?? "");
    setEditEmojiOpen(false);
  }

  const pct = checkInCompletionPercentage(checkIn);

  return (
    <Dialog open={!!checkIn} onOpenChange={(o) => !o && onClose()}>
      {checkIn && (
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              {checkIn.student_name} — {checkIn.workout_title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {checkIn.performed_by === "aluno" ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-xs">
                <span className="text-muted-foreground">
                  Feito pelo aluno — não conta no ciclo de atendimento ainda.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => claimMut.mutate()}
                  disabled={claimMut.isPending}
                >
                  {claimMut.isPending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <BadgeCheck className="mr-2 h-3 w-3" />
                  )}
                  Confirmar check-in
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <BadgeCheck className="h-3 w-3 text-success" />
                Confirmado pelo personal — conta no ciclo de atendimento.
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Exercícios {checkIn.exercises_completed}/{checkIn.exercises_total}
                  </span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            <PseScale value={checkIn.pse} readOnly />

            {checkIn.feedbacks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Histórico</h3>
                <div className="space-y-2">
                  {checkIn.feedbacks.map((fb) =>
                    editingId === fb.id ? (
                      <div key={fb.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Popover open={editEmojiOpen} onOpenChange={setEditEmojiOpen}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="sm">
                                <Smile className="mr-2 h-4 w-4" />
                                {editEmoji ?? "Emoji"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <EmojiPicker
                                onEmojiClick={(data: EmojiClickData) => {
                                  setEditEmoji(data.emoji);
                                  setEditEmojiOpen(false);
                                }}
                                emojiStyle={EmojiStyle.NATIVE}
                              />
                            </PopoverContent>
                          </Popover>
                          {editEmoji && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-muted-foreground"
                              onClick={() => setEditEmoji(null)}
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                        <Textarea
                          rows={3}
                          maxLength={500}
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          placeholder="Mensagem…"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              updateMut.mutate({
                                feedbackId: fb.id,
                                emoji: editEmoji,
                                message: editMessage,
                              })
                            }
                            disabled={(!editMessage.trim() && !editEmoji) || updateMut.isPending}
                          >
                            {updateMut.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={fb.id} className="flex items-start gap-2 rounded-lg border p-3">
                        <div className="flex-1 space-y-1">
                          {fb.emoji && <span className="text-lg leading-none">{fb.emoji}</span>}
                          {fb.message && <p className="text-sm">{fb.message}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Editar feedback"
                            onClick={() => startEdit(fb)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label="Remover feedback"
                            disabled={deleteMut.isPending}
                            onClick={() => deleteMut.mutate(fb.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-2">
                <Label>Reação</Label>
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={reactionMut.isPending}
                    >
                      <Smile className="mr-2 h-4 w-4" /> Escolher emoji
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <EmojiPicker
                      onEmojiClick={(data: EmojiClickData) => reactionMut.mutate(data.emoji)}
                      emojiStyle={EmojiStyle.NATIVE}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feedback-message">Mensagem (opcional)</Label>
                <Textarea
                  id="feedback-message"
                  rows={4}
                  maxLength={500}
                  placeholder="Escreva um feedback sobre o treino…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={() => feedbackMut.mutate(message.trim())}
                disabled={!message.trim() || feedbackMut.isPending}
              >
                {feedbackMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="mr-2 h-4 w-4" /> Enviar feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
