import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { fetchConversations } from "@/lib/api/chat";
import { useAuth } from "@/contexts/use-auth";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_app/aluno/mensagens")({
  head: () =>
    pageHead({
      path: "/aluno/mensagens",
      title: "Mensagens — Núcleo For Life",
      description: "Converse diretamente com seu personal.",
    }),
  component: AlunoMensagensPage,
});

export function AlunoMensagensPage() {
  const { effectiveAlunoId } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: fetchConversations,
    refetchInterval: 10000,
  });

  const conv = data.find((c) => c.student_id === effectiveAlunoId) ?? data[0] ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Fale direto com seu personal.</p>
      </div>

      <Card className="flex flex-1 min-h-0 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : conv ? (
          <ChatWindow
            studentId={conv.student_id}
            peerName={conv.trainer_name}
            currentUserRole="aluno"
            emptyHint="Envie a primeira mensagem para o seu personal!"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-10 w-10" />
            Nenhum personal vinculado ainda.
          </div>
        )}
      </Card>
    </div>
  );
}
