import { http } from "./http";

/**
 * Chat 1:1 entre personal e aluno.
 *
 * Modelo:
 * - Cada conversa é identificada pelo `student_id` (o par personal↔aluno é
 *   derivado do `trainer_id` do aluno). Não há grupos.
 * - Mensagens são somente texto (com emojis) por enquanto — sem anexos.
 *
 * Endpoints esperados no backend Rails:
 * - GET  /api/v1/chat/conversations
 *     Lista conversas visíveis para o usuário atual.
 *     - aluno: apenas a própria conversa (com o personal responsável).
 *     - personal: todas as conversas dos seus alunos ativos.
 *     - admin: todas as conversas.
 * - GET  /api/v1/chat/conversations/:student_id/messages
 * - POST /api/v1/chat/conversations/:student_id/messages { body }
 * - POST /api/v1/chat/conversations/:student_id/read  (marca como lidas)
 */

export type ChatSenderRole = "personal" | "aluno";

export interface ChatMessage {
  id: string;
  student_id: string;
  sender_role: ChatSenderRole;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface ChatConversation {
  /** Identificador da conversa === student_id. */
  student_id: string;
  student_name: string;
  student_avatar_url?: string | null;
  trainer_id: string;
  trainer_name: string;
  last_message?: ChatMessage | null;
  /** Mensagens não lidas do ponto de vista do usuário atual. */
  unread_count: number;
  updated_at: string;
}

export function fetchConversations(): Promise<ChatConversation[]> {
  return http.get<ChatConversation[]>("/api/v1/chat/conversations");
}

export function fetchMessages(studentId: string): Promise<ChatMessage[]> {
  return http.get<ChatMessage[]>(`/api/v1/chat/conversations/${studentId}/messages`);
}

export function sendMessage(studentId: string, body: string): Promise<ChatMessage> {
  return http.post<ChatMessage>(`/api/v1/chat/conversations/${studentId}/messages`, { body });
}

export function markConversationRead(studentId: string): Promise<{ read: number }> {
  return http.post<{ read: number }>(`/api/v1/chat/conversations/${studentId}/read`);
}
