import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AssiduidadePage } from "./_app.aluno.assiduidade";

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

vi.mock("@/lib/api/check-ins", () => ({ fetchCheckInHistory: vi.fn() }));
import { fetchCheckInHistory } from "@/lib/api/check-ins";
const mockFetchHistory = vi.mocked(fetchCheckInHistory);

vi.mock("@/lib/api/feedbacks", () => ({ fetchFeedbacks: vi.fn(), createFeedback: vi.fn() }));
import { fetchFeedbacks, createFeedback } from "@/lib/api/feedbacks";
const mockFetchFeedbacks = vi.mocked(fetchFeedbacks);
const mockCreateFeedback = vi.mocked(createFeedback);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
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

describe("AssiduidadePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHistory.mockResolvedValue([]);
    mockFetchFeedbacks.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(buildAuth());
  });

  it("shows the empty states when there is no history or feedback", async () => {
    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum check-in registrado ainda.");
    expect(screen.getByText("Nenhum recado recebido ainda.")).toBeInTheDocument();
  });

  it("lists check-in history and feedback notes", async () => {
    mockFetchHistory.mockResolvedValue([
      {
        id: "ci1",
        workout_id: "w1",
        workout_title: "Treino A",
        status: "completed",
        exercises_completed: 3,
        exercises_total: 3,
        completed_exercise_ids: ["e1", "e2", "e3"],
        started_at: "2026-07-10T10:00:00Z",
        completed_at: "2026-07-10T10:45:00Z",
      },
    ]);
    mockFetchFeedbacks.mockResolvedValue([
      {
        id: "f1",
        kind: "elogio",
        message: "Mandou muito bem!",
        author_name: "Rafael Monteiro",
        created_at: "2026-07-10T11:00:00Z",
      },
    ]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByText("Mandou muito bem!")).toBeInTheDocument();
    expect(screen.getByText("Rafael Monteiro", { exact: false })).toBeInTheDocument();
  });

  it("does not show 'Enviar feedback' for a plain student", async () => {
    mockUseAuth.mockReturnValue(buildAuth({ canWrite: false }));
    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum recado recebido ainda.");
    expect(screen.queryByRole("button", { name: /Enviar feedback/i })).not.toBeInTheDocument();
  });

  it("lets a personal/admin send feedback", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ canWrite: true, isImpersonating: true, effectiveAlunoId: "s1" }),
    );
    mockCreateFeedback.mockResolvedValue({
      id: "f2",
      kind: "incentivo",
      message: "Continue firme!",
      author_name: "Rafael Monteiro",
      created_at: "2026-07-11T10:00:00Z",
    });
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));
    await user.type(screen.getByLabelText("Mensagem"), "Continue firme!");
    await user.click(screen.getByRole("button", { name: /^Enviar$/ }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", {
        kind: "elogio",
        message: "Continue firme!",
      });
      expect(toast.success).toHaveBeenCalledWith("Recado enviado");
    });
  });
});
