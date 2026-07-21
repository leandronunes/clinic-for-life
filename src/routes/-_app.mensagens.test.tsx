import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { ChatConversation } from "@/lib/api/chat";
import { MensagensPage } from "./_app.mensagens";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
  };
});

vi.mock("@/components/chat/ConversationList", () => ({
  ConversationList: ({ onSelect }: { onSelect: (c: ChatConversation) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          student_id: "s1",
          student_name: "Júlia Ferreira",
          student_avatar_url: null,
          trainer_id: "t1",
          trainer_name: "Rafael Monteiro",
          last_message: null,
          unread_count: 0,
          updated_at: "2026-07-21T10:00:00Z",
        })
      }
    >
      Selecionar Júlia
    </button>
  ),
}));

vi.mock("@/components/chat/ChatWindow", () => ({
  ChatWindow: ({
    studentId,
    peerName,
    currentUserRole,
  }: {
    studentId: string;
    peerName: string;
    currentUserRole: string;
  }) => (
    <div data-testid="chat-window">
      {peerName} / {studentId} / {currentUserRole}
    </div>
  ),
}));

describe("MensagensPage", () => {
  it("shows a placeholder when no conversation is selected", () => {
    render(<MensagensPage />);
    expect(screen.getByText("Selecione uma conversa para começar.")).toBeInTheDocument();
  });

  it("opens the ChatWindow for the selected conversation as personal", async () => {
    const user = userEvent.setup();
    render(<MensagensPage />);

    await user.click(screen.getByRole("button", { name: "Selecionar Júlia" }));

    const chatWindow = await screen.findByTestId("chat-window");
    expect(chatWindow).toHaveTextContent("Júlia Ferreira / s1 / personal");
  });
});
