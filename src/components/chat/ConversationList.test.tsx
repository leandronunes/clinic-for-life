import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationList } from "./ConversationList";
import type { ChatConversation } from "@/lib/api/chat";

vi.mock("@/lib/api/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/chat")>();
  return { ...actual, fetchConversations: vi.fn() };
});

import { fetchConversations } from "@/lib/api/chat";
const mockFetchConversations = vi.mocked(fetchConversations);

function buildConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    student_id: "s1",
    student_name: "Júlia Ferreira",
    student_avatar_url: null,
    trainer_id: "t1",
    trainer_name: "Rafael Monteiro",
    last_message: {
      id: "m1",
      student_id: "s1",
      sender_role: "aluno",
      sender_id: "s1",
      sender_name: "Júlia Ferreira",
      body: "Oi!",
      created_at: "2026-07-21T10:00:00Z",
      read_at: null,
    },
    unread_count: 0,
    updated_at: "2026-07-21T10:00:00Z",
    ...overrides,
  };
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderList(onSelect = vi.fn(), activeStudentId?: string | null) {
  const qc = createQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ConversationList onSelect={onSelect} activeStudentId={activeStudentId} />
    </QueryClientProvider>,
  );
  return { onSelect };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConversationList", () => {
  it("shows a loading state", () => {
    mockFetchConversations.mockReturnValue(new Promise(() => {}));
    renderList();

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("shows an empty state when there are no conversations", async () => {
    mockFetchConversations.mockResolvedValue([]);
    renderList();

    expect(await screen.findByText("Nenhuma conversa disponível.")).toBeInTheDocument();
  });

  it("lists conversations with the student's name and last message", async () => {
    mockFetchConversations.mockResolvedValue([buildConversation()]);
    renderList();

    expect(await screen.findByText("Júlia Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Oi!")).toBeInTheDocument();
  });

  it("shows an unread badge only when unread_count is greater than zero", async () => {
    mockFetchConversations.mockResolvedValue([
      buildConversation({ student_id: "s1", unread_count: 3 }),
    ]);
    renderList();

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("does not show an unread badge when unread_count is zero", async () => {
    mockFetchConversations.mockResolvedValue([buildConversation({ unread_count: 0 })]);
    renderList();

    await screen.findByText("Júlia Ferreira");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("prefixes the last message with 'Você:' only when sent by the personal", async () => {
    mockFetchConversations.mockResolvedValue([
      buildConversation({
        last_message: {
          id: "m1",
          student_id: "s1",
          sender_role: "personal",
          sender_id: "t1",
          sender_name: "Rafael Monteiro",
          body: "Bom treino!",
          created_at: "2026-07-21T10:00:00Z",
          read_at: null,
        },
      }),
    ]);
    renderList();

    expect(await screen.findByText("Você: Bom treino!")).toBeInTheDocument();
  });

  it("shows 'Sem mensagens ainda' when there is no last message", async () => {
    mockFetchConversations.mockResolvedValue([buildConversation({ last_message: null })]);
    renderList();

    expect(await screen.findByText("Sem mensagens ainda")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked conversation", async () => {
    const conversation = buildConversation();
    mockFetchConversations.mockResolvedValue([conversation]);
    const user = userEvent.setup();
    const { onSelect } = renderList();

    await user.click(await screen.findByText("Júlia Ferreira"));

    expect(onSelect).toHaveBeenCalledWith(conversation);
  });

  it("highlights the active conversation", async () => {
    mockFetchConversations.mockResolvedValue([buildConversation({ student_id: "s1" })]);
    renderList(vi.fn(), "s1");

    const button = (await screen.findByText("Júlia Ferreira")).closest("button");
    expect(button).toHaveClass("bg-primary/10");
  });
});
