import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Student } from "@/lib/api/students";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import type { AttendanceCycleRecord } from "@/lib/api/attendance-cycles";
import { AssiduidadeAlunosPage } from "./_app.assiduidade-alunos";

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

vi.mock("@/lib/api/students", () => ({ fetchStudents: vi.fn() }));
import { fetchStudents } from "@/lib/api/students";
const mockFetchStudents = vi.mocked(fetchStudents);

vi.mock("@/lib/api/check-ins", () => ({ fetchCompletedCheckIns: vi.fn(), claimCheckIn: vi.fn() }));
import { fetchCompletedCheckIns, claimCheckIn } from "@/lib/api/check-ins";
const mockFetchCompletedCheckIns = vi.mocked(fetchCompletedCheckIns);
const mockClaimCheckIn = vi.mocked(claimCheckIn);

vi.mock("@/lib/api/attendance-cycles", () => ({
  fetchAttendanceCycleHistory: vi.fn(),
  renewAttendanceCycle: vi.fn(),
}));
import { fetchAttendanceCycleHistory, renewAttendanceCycle } from "@/lib/api/attendance-cycles";
const mockFetchHistory = vi.mocked(fetchAttendanceCycleHistory);
const mockRenewCycle = vi.mocked(renewAttendanceCycle);

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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: { id: "a1", name: "Admin", email: "admin@test.com", role: "admin" },
    token: "tok",
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    hasRole: vi.fn(() => false),
    canWrite: true,
    impersonatedAlunoId: null,
    effectiveAlunoId: null,
    effectiveRole: null,
    isImpersonating: false,
    impersonateAluno: vi.fn(),
    stopImpersonating: vi.fn(),
    ...overrides,
  };
}

function buildStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "s1",
    name: "Júlia Ferreira",
    birth_date: "1990-01-01",
    sex: "female",
    email: "julia@test.com",
    phone: "11999999999",
    trainer_id: "t1",
    trainer_name: "Rafael Monteiro",
    status: "active",
    partner_card_enabled: false,
    contracted_workouts_per_cycle: 8,
    cycle_started_at: "2026-07-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
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
    performed_by: "personal",
    exercises_completed: 3,
    exercises_total: 3,
    completed_exercise_ids: ["e1", "e2", "e3"],
    started_at: "2026-07-10T10:00:00Z",
    completed_at: "2026-07-10T10:45:00Z",
    viewed_at: null,
    pse: null,
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

describe("AssiduidadeAlunosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuth());
    mockFetchStudents.mockResolvedValue([]);
    mockFetchCompletedCheckIns.mockResolvedValue([]);
    mockFetchHistory.mockResolvedValue([]);
  });

  it("shows the loading state while data is fetching", () => {
    mockFetchStudents.mockReturnValue(new Promise(() => {}));

    render(<AssiduidadeAlunosPage />, { wrapper });

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("shows the empty state when there are no students", async () => {
    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Nenhum aluno encontrado.");
  });

  it("shows a student's cycle progress and 'on track' status", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent({ contracted_workouts_per_cycle: 8 })]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ completed_at: "2026-07-10T10:45:00Z" }),
      buildCheckIn({ id: "ci2", completed_at: "2026-07-11T10:45:00Z" }),
      buildCheckIn({ id: "ci3", completed_at: "2026-07-12T10:45:00Z" }),
    ]);

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    const table = screen.getByRole("table");
    expect(within(table).getByText("3 / 8")).toBeInTheDocument();
    expect(within(table).getByText("Em dia")).toBeInTheDocument();
  });

  it("shows 'Sem contrato definido' for a student without a contracted quota", async () => {
    mockFetchStudents.mockResolvedValue([
      buildStudent({ contracted_workouts_per_cycle: null, cycle_started_at: null }),
    ]);

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    const table = screen.getByRole("table");
    expect(within(table).getByText("Sem contrato definido")).toBeInTheDocument();
    expect(within(table).getByText("Sem contrato")).toBeInTheDocument();
  });

  it("flags a student that exceeded the contracted quota, including the header badge", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent({ contracted_workouts_per_cycle: 2 })]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ id: "ci1", completed_at: "2026-07-10T10:45:00Z" }),
      buildCheckIn({ id: "ci2", completed_at: "2026-07-11T10:45:00Z" }),
      buildCheckIn({ id: "ci3", completed_at: "2026-07-12T10:45:00Z" }),
    ]);

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    expect(screen.getByText("1 estourou")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Estourou")).toBeInTheDocument();
  });

  it("filters students by name", async () => {
    mockFetchStudents.mockResolvedValue([
      buildStudent({ id: "s1", name: "Júlia Ferreira" }),
      buildStudent({ id: "s2", name: "Carlos Souza" }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.type(screen.getByPlaceholderText("Buscar aluno..."), "carlos");

    expect(screen.queryByText("Júlia Ferreira")).not.toBeInTheDocument();
    expect(screen.getByText("Carlos Souza")).toBeInTheDocument();
  });

  it("filters students by status", async () => {
    mockFetchStudents.mockResolvedValue([
      buildStudent({ id: "s1", name: "Júlia Ferreira", contracted_workouts_per_cycle: 8 }),
      buildStudent({
        id: "s2",
        name: "Carlos Souza",
        contracted_workouts_per_cycle: null,
        cycle_started_at: null,
      }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.selectOptions(screen.getByRole("combobox"), "no_contract");

    expect(screen.queryByText("Júlia Ferreira")).not.toBeInTheDocument();
    expect(screen.getByText("Carlos Souza")).toBeInTheDocument();
  });

  it("opens the cycle details dialog with completed check-ins", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ completed_at: "2026-07-10T10:45:00Z" }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Júlia Ferreira")).toBeInTheDocument();
    expect(within(dialog).getByText("Treinos concluídos no ciclo (1)")).toBeInTheDocument();
    expect(within(dialog).getByText("Treino A")).toBeInTheDocument();
  });

  it("shows the PSE badge for a completed check-in in the cycle list", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ completed_at: "2026-07-10T10:45:00Z", pse: 3 }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/3 · Leve/)).toBeInTheDocument();
  });

  it("lists a student's self check-in as pending confirmation, not counted in the cycle", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ performed_by: "aluno", completed_at: "2026-07-10T10:45:00Z" }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Treinos concluídos no ciclo (0)")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Check-ins do aluno aguardando confirmação (1)"),
    ).toBeInTheDocument();
  });

  it("confirms a student's self check-in from the cycle details dialog", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockFetchCompletedCheckIns.mockResolvedValue([
      buildCheckIn({ performed_by: "aluno", completed_at: "2026-07-10T10:45:00Z" }),
    ]);
    mockClaimCheckIn.mockResolvedValue(buildCheckIn({ performed_by: "personal" }));
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await vi.waitFor(() => {
      expect(mockClaimCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1");
      expect(toast.success).toHaveBeenCalledWith(
        "Check-in confirmado — agora conta no ciclo de atendimento",
      );
    });
  });

  it("does not offer a renew action for a student without a contract", async () => {
    mockFetchStudents.mockResolvedValue([
      buildStudent({ contracted_workouts_per_cycle: null, cycle_started_at: null }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: /Renovar ciclo/i })).not.toBeInTheDocument();
  });

  it("renews the cycle and shows a success toast", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockRenewCycle.mockResolvedValue(buildStudent());
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Renovar ciclo/i }));

    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Ciclo renovado. A contagem recomeça agora."),
    );
    expect(mockRenewCycle).toHaveBeenCalledWith("s1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error toast when renewing the cycle fails", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockRenewCycle.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Renovar ciclo/i }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível renovar o ciclo."),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the empty state for the cycle history", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Nenhum ciclo encerrado ainda.")).toBeInTheDocument();
  });

  it("lists past closed cycles in the history section", async () => {
    mockFetchStudents.mockResolvedValue([buildStudent()]);
    mockFetchHistory.mockResolvedValue([
      buildCycleRecord({
        id: "cycle1",
        started_at: "2026-05-01T00:00:00Z",
        ended_at: "2026-06-01T00:00:00Z",
        completed_workouts: 6,
        contracted_workouts_per_cycle: 8,
        status: "completed",
      }),
      buildCycleRecord({
        id: "cycle2",
        started_at: "2026-04-01T00:00:00Z",
        ended_at: "2026-05-01T00:00:00Z",
        completed_workouts: 10,
        contracted_workouts_per_cycle: 8,
        percentage: 125,
        status: "exceeded",
      }),
    ]);
    const user = userEvent.setup();

    render(<AssiduidadeAlunosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("6 / 8 treinos (75%)")).toBeInTheDocument();
    expect(within(dialog).getByText("10 / 8 treinos (125%)")).toBeInTheDocument();
    expect(within(dialog).getByText("Cumpriu")).toBeInTheDocument();
    expect(within(dialog).getByText("Estourou")).toBeInTheDocument();
  });

  it("scopes the request to the personal's own students", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        user: {
          id: "p1",
          name: "Rafael Monteiro",
          email: "rafael@test.com",
          role: "personal",
          personal_id: "t1",
        },
        hasRole: vi.fn((...roles) => roles.includes("personal")),
      }),
    );

    render(<AssiduidadeAlunosPage />, { wrapper });

    await vi.waitFor(() =>
      expect(mockFetchStudents).toHaveBeenCalledWith({ trainerId: "t1", status: "active" }),
    );
  });

  it("does not scope the request for an admin", async () => {
    render(<AssiduidadeAlunosPage />, { wrapper });

    await vi.waitFor(() => expect(mockFetchStudents).toHaveBeenCalledWith({ status: "active" }));
  });
});
