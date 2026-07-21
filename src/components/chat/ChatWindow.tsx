import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  fetchMessages,
  markConversationRead,
  sendMessage,
  type ChatMessage,
  type ChatSenderRole,
} from "@/lib/api/chat";
import { EmojiPicker } from "./EmojiPicker";

interface ChatWindowProps {
  studentId: string;
  peerName: string;
  /** Papel do usuário logado nesta conversa. Serve para alinhar bolhas. */
  currentUserRole: ChatSenderRole;
  emptyHint?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, yest)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

interface Group {
  day: string;
  items: ChatMessage[];
}

function groupByDay(msgs: ChatMessage[]): Group[] {
  const groups: Group[] = [];
  for (const m of msgs) {
    const day = new Date(m.created_at).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

export function ChatWindow({ studentId, peerName, currentUserRole, emptyHint }: ChatWindowProps) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", studentId],
    queryFn: () => fetchMessages(studentId),
    refetchInterval: 5000,
  });

  const messages = messagesQuery.data ?? [];
  const groups = useMemo(() => groupByDay(messages), [messages]);

  // Rola pro fim quando chegam novas mensagens ou troca de conversa.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, studentId]);

  // Marca como lidas ao abrir/atualizar a conversa.
  useEffect(() => {
    if (!studentId) return;
    markConversationRead(studentId)
      .then(() => qc.invalidateQueries({ queryKey: ["chat", "conversations"] }))
      .catch(() => {
        // Silencioso: leitura é best-effort.
      });
  }, [studentId, messages.length, qc]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [studentId]);

  const sendMut = useMutation({
    mutationFn: (body: string) => sendMessage(studentId, body),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat", "messages", studentId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    onError: () => toast.error("Não foi possível enviar a mensagem"),
  });

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMut.isPending) return;
    sendMut.mutate(body);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials(peerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{peerName}</p>
          <p className="text-xs text-muted-foreground">
            {messagesQuery.isFetching ? "Atualizando..." : "Chat direto"}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-4 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6"
      >
        {messagesQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando conversa...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            {emptyHint ?? "Nenhuma mensagem ainda. Envie a primeira!"}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="space-y-2">
              <div className="flex justify-center">
                <span className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  {formatDayHeader(g.items[0].created_at)}
                </span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender_role === currentUserRole;
                return (
                  <div
                    key={m.id}
                    className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm whitespace-pre-wrap break-words",
                        mine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-background text-foreground",
                      )}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-xs font-semibold opacity-80">
                          {m.sender_name}
                        </div>
                      )}
                      <p>{m.body}</p>
                      <div
                        className={cn(
                          "mt-1 text-[10px] tabular-nums opacity-70",
                          mine ? "text-right" : "text-left",
                        )}
                      >
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="border-t bg-background p-2 sm:p-3">
        <div className="flex items-end gap-1 sm:gap-2">
          <EmojiPicker
            disabled={sendMut.isPending}
            onSelect={(e) => {
              setDraft((d) => d + e);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          />
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            rows={1}
            className="min-h-[40px] max-h-32 flex-1 resize-none"
            aria-label="Mensagem"
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sendMut.isPending}
            size="icon"
            aria-label="Enviar mensagem"
          >
            {sendMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
