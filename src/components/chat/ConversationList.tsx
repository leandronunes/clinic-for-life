import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchConversations, type ChatConversation } from "@/lib/api/chat";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface ConversationListProps {
  activeStudentId?: string | null;
  onSelect: (c: ChatConversation) => void;
}

export function ConversationList({ activeStudentId, onSelect }: ConversationListProps) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: fetchConversations,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <MessageCircle className="h-8 w-8" />
        Nenhuma conversa disponível.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {data.map((c) => {
        const active = c.student_id === activeStudentId;
        return (
          <li key={c.student_id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                active ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(c.student_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{c.student_name}</p>
                  {c.last_message && (
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {formatShortTime(c.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {c.last_message
                      ? `${c.last_message.sender_role === "aluno" ? "" : "Você: "}${c.last_message.body}`
                      : "Sem mensagens ainda"}
                  </p>
                  {c.unread_count > 0 && (
                    <Badge className="h-5 min-w-5 shrink-0 px-1.5 text-[10px]">
                      {c.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
