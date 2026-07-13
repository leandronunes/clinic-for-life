import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, ClipboardCheck, Dumbbell, Eye, Loader2, Smile } from "lucide-react";
import EmojiPicker, { EmojiStyle, type EmojiClickData } from "emoji-picker-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fetchCompletedCheckIns,
  markCheckInViewed,
  type WorkoutCheckIn,
} from "@/lib/api/check-ins";
import { createFeedback } from "@/lib/api/feedbacks";
import { setReaction } from "@/lib/api/reactions";
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

type ViewState = "not_viewed" | "viewed" | "reacted";

function viewState(checkIn: WorkoutCheckIn): ViewState {
  if (!checkIn.viewed_at) return "not_viewed";
  if (checkIn.reactions.length > 0) return "reacted";
  return "viewed";
}

export function TreinosConcluidosPage() {
  const qc = useQueryClient();
  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ["completed-check-ins"],
    queryFn: fetchCompletedCheckIns,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = checkIns.find((c) => c.id === selectedId) ?? null;

  const invalidate = useCallback(
    () => qc.invalidateQueries({ queryKey: ["completed-check-ins"] }),
    [qc],
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checkIns.map((checkIn) => (
            <CheckInCard
              key={checkIn.id}
              checkIn={checkIn}
              onClick={() => setSelectedId(checkIn.id)}
            />
          ))}
        </div>
      )}

      <CheckInReviewDialog
        checkIn={selected}
        onClose={() => setSelectedId(null)}
        onChanged={invalidate}
      />
    </div>
  );
}

function CheckInCard({ checkIn, onClick }: { checkIn: WorkoutCheckIn; onClick: () => void }) {
  const state = viewState(checkIn);
  const date = new Date(checkIn.completed_at ?? checkIn.started_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 text-left transition hover:border-primary",
        state === "not_viewed" && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{checkIn.student_name}</div>
          <div className="text-sm text-muted-foreground">{checkIn.workout_title}</div>
        </div>
        {state === "not_viewed" && <Badge>Novo</Badge>}
        {state === "viewed" && (
          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Visualizado" />
        )}
        {state === "reacted" && (
          <span className="text-lg" aria-label="Reação enviada">
            {checkIn.reactions[0].emoji}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {date.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · {checkIn.exercises_completed}/{checkIn.exercises_total} exercícios
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
    mutationFn: () => {
      if (!checkIn) throw new Error("Nenhum check-in selecionado");
      return createFeedback(checkIn.student_id, {
        workout_check_in_id: checkIn.id,
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
      return setReaction(checkIn.student_id, checkIn.workout_id, checkIn.id, emoji);
    },
    onSuccess: () => {
      toast.success("Reação enviada");
      setEmojiOpen(false);
      onChanged();
    },
    onError: () => toast.error("Não foi possível enviar a reação"),
  });

  const handleEmojiClick = (data: EmojiClickData) => reactionMut.mutate(data.emoji);

  const pct =
    checkIn && checkIn.exercises_total
      ? Math.round((checkIn.exercises_completed / checkIn.exercises_total) * 100)
      : 0;

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

            {(checkIn.feedbacks.length > 0 || checkIn.reactions.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Histórico</h3>
                {checkIn.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {checkIn.reactions.map((reaction) => (
                      <span
                        key={reaction.id}
                        className="rounded-full bg-muted px-2 py-1 text-base"
                        title={reaction.author_name ?? undefined}
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
                {checkIn.feedbacks.map((feedback) => (
                  <Card key={feedback.id} className="shadow-soft">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm">{feedback.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Reagir com emoji</Label>
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Smile className="mr-2 h-4 w-4" /> Escolher emoji
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <EmojiPicker onEmojiClick={handleEmojiClick} emojiStyle={EmojiStyle.NATIVE} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="grid gap-2">
                <Label htmlFor="feedback-message">Mensagem</Label>
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
                onClick={() => feedbackMut.mutate()}
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
