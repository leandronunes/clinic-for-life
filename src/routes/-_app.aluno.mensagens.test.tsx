import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ChatConversation } from "@/lib/api/chat";
import { AlunoMensagensPage } from "./_app.aluno.mensagens";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/chat")>();
  return { ...actual, fetchConversations: vi.fn() };
});
import { fetchConversations } from "@/lib/api/chat";
const mockFetchConversations = vi.mocked(fetchConversations);

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

function buildConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    student_id: "s1",
    student_name: "Júlia Ferreira",
    student_avatar_url: null,
    trainer_id: "t1",
    trainer_name: "Rafael Monteiro",
    last_message: null,
    unread_count: 0,
    updated_at: "2026-07-21T10:00:00Z",
    ...overrides,
  };
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: { id: "s1", name: "Júlia Ferreira", email: "julia@test.com", role: "aluno" },
    token: "tok",
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    hasRole: vi.fn(() => false),
    canWrite: false,
    impersonatedAlunoId: null,
    effectiveAlunoId: "s1",
    effectiveRole: "aluno",
    isImpersonating: false,
    impersonateAluno: vi.fn(),
    stopImpersonating: vi.fn(),
    ...overrides,
  };
}

describe("AlunoMensagensPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuth());
  });

  it("shows a loading state while fetching", () => {
    mockFetchConversations.mockReturnValue(new Promise(() => {}));
    render(<AlunoMensagensPage />, { wrapper });

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("shows a message when no personal is linked yet", async () => {
    mockFetchConversations.mockResolvedValue([]);
    render(<AlunoMensagensPage />, { wrapper });

    expect(await screen.findByText("Nenhum personal vinculado ainda.")).toBeInTheDocument();
  });

  it("opens the ChatWindow for the aluno's own conversation, using the trainer's name", async () => {
    mockFetchConversations.mockResolvedValue([buildConversation()]);
    render(<AlunoMensagensPage />, { wrapper });

    const chatWindow = await screen.findByTestId("chat-window");
    expect(chatWindow).toHaveTextContent("Rafael Monteiro / s1 / aluno");
  });

  it("falls back to the first conversation when none matches effectiveAlunoId", async () => {
    mockUseAuth.mockReturnValue(buildAuth({ effectiveAlunoId: "does-not-match" }));
    mockFetchConversations.mockResolvedValue([buildConversation({ student_id: "s1" })]);
    render(<AlunoMensagensPage />, { wrapper });

    const chatWindow = await screen.findByTestId("chat-window");
    expect(chatWindow).toHaveTextContent("s1");
  });
});
