import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Workout } from "@/lib/api/workouts";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import { MeuTreinoPage } from "./_app.aluno.index";

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

vi.mock("@/lib/api/workouts", () => ({
  fetchWorkouts: vi.fn(),
  reorderWorkouts: vi.fn(),
}));
import { fetchWorkouts } from "@/lib/api/workouts";
const mockFetchWorkouts = vi.mocked(fetchWorkouts);

vi.mock("@/lib/api/students", () => ({ fetchStudent: vi.fn() }));
import { fetchStudent } from "@/lib/api/students";
const mockFetchStudent = vi.mocked(fetchStudent);

vi.mock("@/lib/api/check-ins", () => ({ fetchCheckInHistory: vi.fn() }));
import { fetchCheckInHistory } from "@/lib/api/check-ins";
const mockFetchCheckInHistory = vi.mocked(fetchCheckInHistory);

vi.mock("@/components/treino/treino-card", () => ({
  TreinoCard: ({ treino }: { treino: Workout }) => (
    <div data-testid="treino-card">{treino.title}</div>
  ),
}));
vi.mock("@/components/treino/colar-treino-button", () => ({
  ColarTreinoButton: () => null,
}));
vi.mock("@/components/treino/treino-form-dialog", () => ({
  NovoTreinoDialog: () => null,
}));
vi.mock("@/components/treino/exercise-video-dialog", () => ({
  ExerciseVideoDialog: () => null,
}));

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: { id: "s1", name: "Júlia Ferreira", email: "julia@test.com", role: "aluno" },
    token: "tok",
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
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

function buildWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: "w1",
    position: 1,
    title: "Treino A",
    focus: "Push",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    exercises: [],
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
    student_confirmed_at: "2026-07-16T10:30:00.000Z",
    personal_confirmed_at: null,
    exercises_completed: 1,
    exercises_total: 1,
    completed_exercise_ids: ["e1"],
    started_at: "2026-07-16T10:00:00.000Z",
    completed_at: "2026-07-16T10:30:00.000Z",
    viewed_at: null,
    pse: null,
    feedbacks: [],
    ...overrides,
  };
}

const workoutA = buildWorkout({ id: "w1", position: 1, title: "Treino A" });
const workoutB = buildWorkout({ id: "w2", position: 2, title: "Treino B" });
const workoutC = buildWorkout({ id: "w3", position: 3, title: "Treino C" });

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

describe("MeuTreinoPage — rotação e indicador de último treino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuth());
    mockFetchStudent.mockResolvedValue({
      id: "s1",
      name: "Júlia Ferreira",
      email: "julia@test.com",
      birth_date: "1996-01-01",
      sex: "female",
      phone: "",
      trainer_id: "t1",
      trainer_name: "Rafael Monteiro",
      status: "active",
      partner_card_enabled: true,
      created_at: "2026-01-01T00:00:00Z",
    });
  });

  it("badges the last executed workout's tab and leaves the others unmarked", async () => {
    mockFetchWorkouts.mockResolvedValue({ active: [workoutA, workoutB, workoutC], archived: [] });
    mockFetchCheckInHistory.mockResolvedValue([
      buildCheckIn({ workout_id: "w1", completed_at: "2026-07-16T09:00:00.000Z" }),
    ]);

    render(<MeuTreinoPage />, { wrapper });

    const badgedButton = await screen.findByRole("button", {
      name: "Treino A — último treino executado",
    });
    expect(badgedButton).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Treino B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Treino C" })).toBeInTheDocument();
  });

  it("selects the next workout in rotation after the last executed one on load", async () => {
    mockFetchWorkouts.mockResolvedValue({ active: [workoutA, workoutB, workoutC], archived: [] });
    mockFetchCheckInHistory.mockResolvedValue([
      buildCheckIn({ workout_id: "w1", completed_at: "2026-07-16T09:00:00.000Z" }),
    ]);

    render(<MeuTreinoPage />, { wrapper });

    const card = await screen.findByTestId("treino-card");
    expect(card).toHaveTextContent("Treino B");
  });

  it("wraps circularly to the first workout when the last executed one was the last in the list", async () => {
    mockFetchWorkouts.mockResolvedValue({ active: [workoutA, workoutB, workoutC], archived: [] });
    mockFetchCheckInHistory.mockResolvedValue([
      buildCheckIn({ workout_id: "w3", completed_at: "2026-07-16T09:00:00.000Z" }),
    ]);

    render(<MeuTreinoPage />, { wrapper });

    const card = await screen.findByTestId("treino-card");
    expect(card).toHaveTextContent("Treino A");
  });

  it("defaults to the first workout when there is no execution history", async () => {
    mockFetchWorkouts.mockResolvedValue({ active: [workoutA, workoutB, workoutC], archived: [] });
    mockFetchCheckInHistory.mockResolvedValue([]);

    render(<MeuTreinoPage />, { wrapper });

    const card = await screen.findByTestId("treino-card");
    expect(card).toHaveTextContent("Treino A");
    expect(
      screen.queryByRole("button", { name: /último treino executado/i }),
    ).not.toBeInTheDocument();
  });

  it("lets the aluno override the default selection by clicking another tab", async () => {
    mockFetchWorkouts.mockResolvedValue({ active: [workoutA, workoutB, workoutC], archived: [] });
    mockFetchCheckInHistory.mockResolvedValue([
      buildCheckIn({ workout_id: "w1", completed_at: "2026-07-16T09:00:00.000Z" }),
    ]);
    const user = userEvent.setup();

    render(<MeuTreinoPage />, { wrapper });

    await screen.findByTestId("treino-card");
    await user.click(screen.getByRole("button", { name: "Treino C" }));

    expect(screen.getByTestId("treino-card")).toHaveTextContent("Treino C");
  });
});
