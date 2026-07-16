import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
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

vi.mock("@/lib/api/check-ins", () => ({
  fetchCheckInHistory: vi.fn(),
  deleteCheckIn: vi.fn(),
  claimCheckIn: vi.fn(),
}));
import { fetchCheckInHistory, deleteCheckIn, claimCheckIn } from "@/lib/api/check-ins";
const mockFetchHistory = vi.mocked(fetchCheckInHistory);
const mockDeleteCheckIn = vi.mocked(deleteCheckIn);
const mockClaimCheckIn = vi.mocked(claimCheckIn);

vi.mock("@/lib/api/attendance-cycles", () => ({ fetchAttendanceCycleHistory: vi.fn() }));
import { fetchAttendanceCycleHistory } from "@/lib/api/attendance-cycles";
import type { AttendanceCycleRecord } from "@/lib/api/attendance-cycles";
const mockFetchCycleHistory = vi.mocked(fetchAttendanceCycleHistory);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";

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
    performed_by: "aluno",
    exercises_completed: 3,
    exercises_total: 3,
    completed_exercise_ids: ["e1", "e2", "e3"],
    started_at: "2026-07-10T10:00:00Z",
    completed_at: "2026-07-10T10:45:00Z",
    viewed_at: null,
    feedbacks: [],
    ...overrides,
  };
}

function buildCycleRecord(overrides: Partial<AttendanceCycleRecord> = {}): AttendanceCycleRecord {
  return {
    id: "cycle1",
    student_id: "s1",
    contracted_workouts_per_cycle: 8,
    completed_workouts: 6,
    percentage: 75,
    status: "completed",
    started_at: "2026-05-01T00:00:00Z",
    ended_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("AssiduidadePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHistory.mockResolvedValue([]);
    mockFetchCycleHistory.mockResolvedValue([]);
    mockDeleteCheckIn.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuth());
    // Don't rely on the ambient .env — pin a known "off" baseline so these
    // tests pass regardless of what's set on the machine running them.
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            emoji: "💪",
            message: null,
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
            emoji: "💪",
            message: null,
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
    expect(within(dialog).getByTitle("Rafael Monteiro")).toHaveTextContent("💪");
    expect(within(dialog).queryByText("Mandou muito bem!")).not.toBeInTheDocument();
  });

  it("shows the feedback message inside the day's check-in detail", async () => {
    mockFetchHistory.mockResolvedValue([
      buildCheckIn({
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            emoji: null,
            message: "Mandou muito bem no treino de hoje, continue assim!",
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
    expect(
      within(dialog).getByText("Mandou muito bem no treino de hoje, continue assim!"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("— Rafael Monteiro")).toBeInTheDocument();
  });

  it("shows today's emoji reactions in the feedback banner", async () => {
    const todayIso = new Date().toISOString();
    mockFetchHistory.mockResolvedValue([
      buildCheckIn({
        started_at: todayIso,
        completed_at: todayIso,
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            emoji: "🔥",
            message: null,
            author_name: "Rafael Monteiro",
            created_at: todayIso,
          },
        ],
      }),
    ]);

    render(<AssiduidadePage />, { wrapper });

    expect(await screen.findByText("Feedback do personal de hoje")).toBeInTheDocument();
    expect(screen.getByTitle("Rafael Monteiro")).toHaveTextContent("🔥");
  });

  it("shows today's text feedbacks in the feedback banner", async () => {
    const todayIso = new Date().toISOString();
    mockFetchHistory.mockResolvedValue([
      buildCheckIn({
        started_at: todayIso,
        completed_at: todayIso,
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            emoji: null,
            message: "Ótimo esforço hoje!",
            author_name: "Rafael Monteiro",
            created_at: todayIso,
          },
        ],
      }),
    ]);

    render(<AssiduidadePage />, { wrapper });

    expect(await screen.findByText("Feedback do personal de hoje")).toBeInTheDocument();
    expect(screen.getByText("Ótimo esforço hoje!")).toBeInTheDocument();
    expect(screen.getByText("— Rafael Monteiro")).toBeInTheDocument();
  });

  it("does not show the feedback banner when there are no today's reactions or feedbacks", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn()]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    expect(screen.queryByText("Feedback do personal de hoje")).not.toBeInTheDocument();
  });

  it("does not show a cycle history section when there are no closed cycles", async () => {
    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum check-in registrado ainda.");
    expect(screen.queryByText("Histórico de ciclos")).not.toBeInTheDocument();
  });

  it("shows past closed cycles in the history section when the feature flag is on", async () => {
    vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "true");
    mockFetchCycleHistory.mockResolvedValue([
      buildCycleRecord({
        completed_workouts: 6,
        contracted_workouts_per_cycle: 8,
        status: "completed",
      }),
    ]);

    render(<AssiduidadePage />, { wrapper });

    expect(await screen.findByText("Histórico de ciclos")).toBeInTheDocument();
    expect(screen.getByText("6 / 8 treinos (75%)")).toBeInTheDocument();
    expect(screen.getByText("Cumpriu")).toBeInTheDocument();
  });

  it("hides the cycle history section when the feature flag is off, even with closed cycles", async () => {
    mockFetchCycleHistory.mockResolvedValue([buildCycleRecord()]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Nenhum check-in registrado ainda.");
    expect(screen.queryByText("Histórico de ciclos")).not.toBeInTheDocument();
    expect(mockFetchCycleHistory).not.toHaveBeenCalled();
  });

  it("offers to remove a check-in directly from the 'dia' view, without opening a dialog", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn()]);
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    // "dia" is the default view — the check-in row itself must offer removal.
    await screen.findByText("Treino A");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: 'Remover check-in de "Treino A"' }));

    const confirmDialog = await screen.findByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Remover" }));

    await vi.waitFor(() => expect(mockDeleteCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1"));
  });

  it("removes a check-in after confirming, and refreshes the history", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn()]);
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    await user.click(screen.getByRole("tab", { name: "Semana" }));
    await user.click(screen.getByRole("button", { name: /10\/07\/2026/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: 'Remover check-in de "Treino A"' }),
    );

    const confirmDialog = await screen.findByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Remover" }));

    await vi.waitFor(() => expect(mockDeleteCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1"));
    expect(toast.success).toHaveBeenCalledWith("Check-in removido");
  });

  it("shows an error toast when removing a check-in fails", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn()]);
    mockDeleteCheckIn.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    await user.click(screen.getByRole("tab", { name: "Semana" }));
    await user.click(screen.getByRole("button", { name: /10\/07\/2026/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: 'Remover check-in de "Treino A"' }),
    );

    const confirmDialog = await screen.findByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Remover" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível remover o check-in"),
    );
  });

  it("shows a badge for a check-in the aluno performed themselves", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "aluno" })]);

    render(<AssiduidadePage />, { wrapper });

    expect(await screen.findByText("Feito pelo aluno")).toBeInTheDocument();
    expect(screen.queryByText("Confirmado pelo personal")).not.toBeInTheDocument();
  });

  it("shows a distinct badge for a check-in performed/confirmed by the personal", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "personal" })]);

    render(<AssiduidadePage />, { wrapper });

    expect(await screen.findByText("Confirmado pelo personal")).toBeInTheDocument();
    expect(screen.queryByText("Feito pelo aluno")).not.toBeInTheDocument();
  });

  it("hides the delete button for the aluno once the personal has performed/confirmed the check-in", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "personal" })]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Treino A");
    expect(screen.queryByText("Feito pelo aluno")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: 'Remover check-in de "Treino A"' }),
    ).not.toBeInTheDocument();
  });

  it("still lets a personal remove a check-in they performed, viewing via impersonation", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ hasRole: vi.fn((...roles) => roles.includes("personal")) }),
    );
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "personal" })]);

    render(<AssiduidadePage />, { wrapper });

    expect(
      await screen.findByRole("button", { name: 'Remover check-in de "Treino A"' }),
    ).toBeInTheDocument();
  });

  it("does not offer a claim action to the aluno themselves", async () => {
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "aluno" })]);

    render(<AssiduidadePage />, { wrapper });

    await screen.findByText("Feito pelo aluno");
    expect(screen.queryByRole("button", { name: "Confirmar check-in" })).not.toBeInTheDocument();
  });

  it("lets a personal confirm a check-in the aluno performed themselves, viewing via impersonation", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ hasRole: vi.fn((...roles) => roles.includes("personal")) }),
    );
    mockFetchHistory.mockResolvedValue([buildCheckIn({ performed_by: "aluno" })]);
    mockClaimCheckIn.mockResolvedValue(buildCheckIn({ performed_by: "personal" }));
    const user = userEvent.setup();

    render(<AssiduidadePage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Confirmar check-in" }));

    await vi.waitFor(() => {
      expect(mockClaimCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1");
      expect(toast.success).toHaveBeenCalledWith(
        "Check-in confirmado — agora conta no ciclo de atendimento",
      );
    });
  });
});
