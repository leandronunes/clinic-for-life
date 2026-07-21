import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";
import type { ChatConversation } from "@/lib/api/chat";

export const Route = createFileRoute("/_app/mensagens")({
  head: () =>
    pageHead({
      path: "/mensagens",
      title: "Mensagens — Núcleo For Life",
      description: "Converse diretamente com seus alunos.",
    }),
  component: MensagensPage,
});

export function MensagensPage() {
  const [active, setActive] = useState<ChatConversation | null>(null);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Converse com seus alunos em tempo (quase) real.
        </p>
      </div>

      <Card className="flex flex-1 min-h-0 overflow-hidden p-0">
        <aside
          className={cn(
            "w-full border-r md:w-80 md:shrink-0",
            active ? "hidden md:block" : "block",
          )}
        >
          <div className="h-full overflow-y-auto">
            <ConversationList activeStudentId={active?.student_id} onSelect={setActive} />
          </div>
        </aside>

        <section className={cn("flex-1 min-h-0", active ? "block" : "hidden md:block")}>
          {active ? (
            <div className="flex h-full flex-col">
              <div className="border-b bg-muted/30 p-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="text-sm font-medium text-primary"
                >
                  ← Voltar
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatWindow
                  studentId={active.student_id}
                  peerName={active.student_name}
                  currentUserRole="personal"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-10 w-10" />
              Selecione uma conversa para começar.
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
