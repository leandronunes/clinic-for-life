import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, Loader2, MessageSquarePlus, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchCheckInHistory, type WorkoutCheckIn } from "@/lib/api/check-ins";
import {
  fetchFeedbacks,
  createFeedback,
  type Feedback,
  type FeedbackKind,
} from "@/lib/api/feedbacks";
import { useAuth } from "@/contexts/use-auth";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/aluno/assiduidade")({
  head: () =>
    pageHead({
      path: "/aluno/assiduidade",
      title: "Assiduidade — Núcleo For Life",
      description: "Histórico de treinos concluídos e recados do seu personal trainer.",
    }),
  component: AssiduidadePage,
});

const KIND_LABEL: Record<FeedbackKind, string> = {
  elogio: "Elogio",
  correcao: "Correção",
  incentivo: "Incentivo",
};

const KIND_BADGE_CLASS: Record<FeedbackKind, string> = {
  elogio: "bg-success text-success-foreground",
  correcao: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  incentivo: "",
};

export function AssiduidadePage() {
  const { user, effectiveAlunoId, canWrite } = useAuth();
  const alunoId = effectiveAlunoId ?? user?.id ?? "";
  const qc = useQueryClient();

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ["check-in", "history", alunoId],
    queryFn: () => fetchCheckInHistory(alunoId),
    enabled: !!alunoId,
  });

  const { data: feedbacks = [], isLoading: loadingFeedbacks } = useQuery({
    queryKey: ["feedbacks", alunoId],
    queryFn: () => fetchFeedbacks(alunoId),
    enabled: !!alunoId,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Assiduidade</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de treinos concluídos e recados do seu personal.
          </p>
        </div>
        {canWrite && (
          <SendFeedbackDialog
            alunoId={alunoId}
            onSent={() => qc.invalidateQueries({ queryKey: ["feedbacks", alunoId] })}
          />
        )}
      </div>

      <section aria-label="Histórico de treinos" className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarCheck className="h-4 w-4" /> Histórico de treinos
        </h2>
        {loadingHistorico ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : historico.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum check-in registrado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {historico.map((checkIn) => (
              <CheckInRow key={checkIn.id} checkIn={checkIn} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Feedback do personal" className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ThumbsUp className="h-4 w-4" /> Feedback do Personal
        </h2>
        {loadingFeedbacks ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : feedbacks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum recado recebido ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CheckInRow({ checkIn }: { checkIn: WorkoutCheckIn }) {
  const date = new Date(checkIn.completed_at ?? checkIn.started_at);
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <div className="font-medium">{checkIn.workout_title}</div>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString("pt-BR")} · {checkIn.exercises_completed}/
            {checkIn.exercises_total} exercícios
          </p>
        </div>
        <Badge
          variant={checkIn.status === "completed" ? "default" : "secondary"}
          className={checkIn.status === "completed" ? "bg-success text-success-foreground" : ""}
        >
          {checkIn.status === "completed" ? "Concluído" : "Em andamento"}
        </Badge>
      </CardContent>
    </Card>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className={cn("text-[10px]", KIND_BADGE_CLASS[feedback.kind])}>
            {KIND_LABEL[feedback.kind]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(feedback.created_at).toLocaleDateString("pt-BR")}
          </span>
        </div>
        <p className="text-sm">{feedback.message}</p>
        {feedback.author_name && (
          <p className="text-xs text-muted-foreground">— {feedback.author_name}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SendFeedbackDialog({ alunoId, onSent }: { alunoId: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("elogio");
  const [message, setMessage] = useState("");

  const sendMut = useMutation({
    mutationFn: () => createFeedback(alunoId, { kind, message }),
    onSuccess: () => {
      toast.success("Recado enviado");
      setMessage("");
      setKind("elogio");
      setOpen(false);
      onSent();
    },
    onError: () => toast.error("Não foi possível enviar o recado"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Enviar feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar feedback ao aluno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="feedback-kind">Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as FeedbackKind)}>
              <SelectTrigger id="feedback-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="elogio">Elogio</SelectItem>
                <SelectItem value="correcao">Correção</SelectItem>
                <SelectItem value="incentivo">Incentivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              rows={4}
              maxLength={500}
              placeholder="Escreva um recado para o aluno…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => sendMut.mutate()}
            disabled={!message.trim() || sendMut.isPending}
          >
            {sendMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              "Enviar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
