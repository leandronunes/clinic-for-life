import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
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

function buildCheckIn(overrides: Partial<WorkoutCheckIn> = {}): WorkoutCheckIn {
  return {
    id: "ci1",
    workout_id: "w1",
    workout_title: "Treino A",
    student_id: "s1",
    student_name: "Júlia Ferreira",
    status: "completed",
    exercises_completed: 3,
    exercises_total: 3,
    completed_exercise_ids: ["e1", "e2", "e3"],
    started_at: "2026-07-10T10:00:00Z",
    completed_at: "2026-07-10T10:45:00Z",
    viewed_at: null,
    feedbacks: [],
    reactions: [],
    ...overrides,
  };
}

describe("AssiduidadePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHistory.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(buildAuth());
  });

  it("shows the empty state when there is no check-in history", async () => {
    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum check-in registrado ainda.");
  });

  it("lists check-in history", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn()]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });

  it("no longer offers a general 'Enviar feedback' action", async () => {
    mockUseAuth.mockReturnValue(buildAuth({ canWrite: true }));
    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum check-in registrado ainda.");
    expect(screen.queryByRole("button", { name: /Enviar feedback/i })).not.toBeInTheDocument();
  });

  it("shows a reaction emoji next to a check-in that received one", async () => {
    mockFetchHistory.mockResolvedValue([
      buildCheckIn({
        reactions: [
          {
            id: "r1",
            emoji: "💪",
            author_name: "Rafael Monteiro",
            created_at: "2026-07-10T11:00:00Z",
          },
        ],
      }),
    ]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    expect(screen.getByLabelText("Reação do personal")).toHaveTextContent("💪");
  });

  it("shows feedback and reactions inside the day's check-in detail", async () => {
    mockFetchHistory.mockResolvedValue([
      buildCheckIn({
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            message: "Mandou muito bem!",
            author_name: "Rafael Monteiro",
            created_at: "2026-07-10T11:00:00Z",
          },
        ],
        reactions: [
          {
            id: "r1",
            emoji: "💪",
            author_name: "Rafael Monteiro",
            created_at: "2026-07-10T11:00:00Z",
          },
        ],
      }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    await user.click(screen.getByRole("tab", { name: "Semana" }));
    await user.click(screen.getByRole("button", { name: /10\/07\/2026/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Mandou muito bem!")).toBeInTheDocument();
    expect(within(dialog).getByText("Rafael Monteiro", { exact: false })).toBeInTheDocument();
  });
});
