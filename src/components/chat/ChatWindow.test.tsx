import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatWindow } from "./ChatWindow";
import type { ChatMessage } from "@/lib/api/chat";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/chat")>();
  return {
    ...actual,
    fetchMessages: vi.fn(),
    sendMessage: vi.fn(),
    markConversationRead: vi.fn(),
  };
});

import { fetchMessages, sendMessage, markConversationRead } from "@/lib/api/chat";

const mockFetchMessages = vi.mocked(fetchMessages);
const mockSendMessage = vi.mocked(sendMessage);
const mockMarkConversationRead = vi.mocked(markConversationRead);

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    student_id: "s1",
    sender_role: "personal",
    sender_id: "u1",
    sender_name: "Rafael Monteiro",
    body: "Oi!",
    created_at: "2026-07-21T10:00:00Z",
    read_at: null,
    ...overrides,
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderChatWindow(overrides: Partial<React.ComponentProps<typeof ChatWindow>> = {}) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ChatWindow
        studentId="s1"
        peerName="Rafael Monteiro"
        currentUserRole="aluno"
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkConversationRead.mockResolvedValue({ read: 0 });
});

describe("ChatWindow", () => {
  it("shows a loading state while fetching messages", () => {
    mockFetchMessages.mockReturnValue(new Promise(() => {}));
    renderChatWindow();

    expect(screen.getByText("Carregando conversa...")).toBeInTheDocument();
  });

  it("shows the empty hint when there are no messages", async () => {
    mockFetchMessages.mockResolvedValue([]);
    renderChatWindow({ emptyHint: "Envie a primeira mensagem para o seu personal!" });

    expect(
      await screen.findByText("Envie a primeira mensagem para o seu personal!"),
    ).toBeInTheDocument();
  });

  it("shows a default empty hint when none is provided", async () => {
    mockFetchMessages.mockResolvedValue([]);
    renderChatWindow();

    expect(
      await screen.findByText("Nenhuma mensagem ainda. Envie a primeira!"),
    ).toBeInTheDocument();
  });

  it("renders messages grouped by day, showing the sender name only for the other side", async () => {
    mockFetchMessages.mockResolvedValue([
      buildMessage({
        id: "m1",
        sender_role: "personal",
        sender_name: "Rafael Monteiro",
        body: "Oi!",
      }),
      buildMessage({
        id: "m2",
        sender_role: "aluno",
        sender_name: "Júlia Ferreira",
        body: "Oi, tudo bem?",
      }),
    ]);
    renderChatWindow({ currentUserRole: "aluno", peerName: "Personal Vinculado" });

    expect(await screen.findByText("Oi!")).toBeInTheDocument();
    expect(screen.getByText("Oi, tudo bem?")).toBeInTheDocument();
    // The viewer is "aluno" — their own message (m2) shows no sender name label,
    // only the other side's (m1, personal) does.
    expect(screen.getByText("Rafael Monteiro")).toBeInTheDocument();
    expect(screen.queryByText("Júlia Ferreira")).not.toBeInTheDocument();
  });

  it("sends a message when the send button is clicked", async () => {
    mockFetchMessages.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue(buildMessage({ id: "m2", body: "Nova mensagem" }));
    const user = userEvent.setup();
    renderChatWindow();

    await screen.findByText("Nenhuma mensagem ainda. Envie a primeira!");
    await user.type(screen.getByLabelText("Mensagem"), "Nova mensagem");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("s1", "Nova mensagem");
    });
  });

  it("sends a message on Enter, but not on Shift+Enter", async () => {
    mockFetchMessages.mockResolvedValue([]);
    mockSendMessage.mockResolvedValue(buildMessage());
    const user = userEvent.setup();
    renderChatWindow();

    const input = await screen.findByLabelText("Mensagem");
    await user.type(input, "Linha 1");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(mockSendMessage).not.toHaveBeenCalled();

    await user.type(input, "Linha 2");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  it("disables the send button while the draft is empty", async () => {
    mockFetchMessages.mockResolvedValue([]);
    renderChatWindow();

    await screen.findByText("Nenhuma mensagem ainda. Envie a primeira!");
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  });

  it("shows an error toast when sending fails", async () => {
    mockFetchMessages.mockResolvedValue([]);
    mockSendMessage.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderChatWindow();

    await screen.findByText("Nenhuma mensagem ainda. Envie a primeira!");
    await user.type(screen.getByLabelText("Mensagem"), "Oi");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Não foi possível enviar a mensagem");
    });
  });

  it("marks the conversation as read on mount, best-effort", async () => {
    mockFetchMessages.mockResolvedValue([buildMessage()]);
    renderChatWindow();

    await waitFor(() => {
      expect(mockMarkConversationRead).toHaveBeenCalledWith("s1");
    });
  });

  it("does not blow up when marking as read fails", async () => {
    mockFetchMessages.mockResolvedValue([buildMessage()]);
    mockMarkConversationRead.mockRejectedValue(new Error("network error"));
    renderChatWindow();

    expect(await screen.findByText("Oi!")).toBeInTheDocument();
  });
});
