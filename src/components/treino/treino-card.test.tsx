import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TreinoCard } from "./treino-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Exercise, Workout } from "@/lib/api/workouts";
import { createExercise, deleteWorkout, updateExercise } from "@/lib/api/workouts";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return {
    ...actual,
    createWorkout: vi.fn(),
    archiveWorkout: vi.fn(),
    unarchiveWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    reorderExercises: vi.fn().mockResolvedValue([]),
    reorderWorkouts: vi.fn().mockResolvedValue([]),
    createExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
  };
});

const mockCreateExercise = vi.mocked(createExercise);
const mockDeleteWorkout = vi.mocked(deleteWorkout);
const mockUpdateExercise = vi.mocked(updateExercise);

vi.mock("@/components/ExercicioVideoInput", () => ({
  ExercicioVideoInput: () => null,
}));

vi.mock("@/lib/video-url", () => ({
  isUploadedVideo: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/api/check-ins", () => ({
  fetchCurrentCheckIn: vi.fn(),
  startCheckIn: vi.fn(),
  finishCheckIn: vi.fn(),
  toggleExerciseCheckIn: vi.fn(),
  deleteCheckIn: vi.fn(),
  confirmCheckIn: vi.fn(),
  updateCheckInPse: vi.fn(),
}));
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  deleteCheckIn,
  confirmCheckIn,
  updateCheckInPse,
  type WorkoutCheckIn,
} from "@/lib/api/check-ins";
const mockFetchCurrentCheckIn = vi.mocked(fetchCurrentCheckIn);
const mockStartCheckIn = vi.mocked(startCheckIn);
const mockDeleteCheckIn = vi.mocked(deleteCheckIn);
const mockConfirmCheckIn = vi.mocked(confirmCheckIn);
const mockFinishCheckIn = vi.mocked(finishCheckIn);
const mockToggleExerciseCheckIn = vi.mocked(toggleExerciseCheckIn);
const mockUpdateCheckInPse = vi.mocked(updateCheckInPse);

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: { id: "s1", name: "Julia Ferreira", email: "julia@test.com", role: "aluno" },
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}

const mockWorkout: Workout = {
  id: "w1",
  position: 1,
  title: "Treino A — Push",
  focus: "Empurrar",
  status: "active",
  created_at: "2026-01-01",
  exercises: [
    {
      id: "e2",
      position: 2,
      name: "Crucifixo",
      sets: 3,
      reps: "12",
      rest_seconds: 60,
      muscle_group: "Peito",
      video_url: "",
    },
    {
      id: "e1",
      position: 1,
      name: "Supino reto",
      sets: 4,
      reps: "8-10",
      rest_seconds: 90,
      muscle_group: "Peito",
      video_url: "",
    },
  ],
};

describe("TreinoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockCreateExercise.mockResolvedValue({ ...mockWorkout.exercises[0], id: "new" });
    mockDeleteWorkout.mockResolvedValue(null);
    mockUpdateExercise.mockResolvedValue(mockWorkout.exercises[1]);
    mockFetchCurrentCheckIn.mockResolvedValue(null);
    mockDeleteCheckIn.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuth());
    // ExecucaoTreinoDialog's carousel (Embla) reads matchMedia on mount — jsdom
    // doesn't implement it.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders exercises sorted by position regardless of array order", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    // mockWorkout has e2 (position=2) before e1 (position=1) in the array —
    // the component must reorder so position=1 (Supino reto) appears first.
    const nameSpans = screen.getAllByText(/Supino reto|Crucifixo/);
    expect(nameSpans[0].textContent).toBe("Supino reto");
    expect(nameSpans[1].textContent).toBe("Crucifixo");
  });

  it("shows the trainerName prop, not any field on the workout, as the personal's name", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Beatriz Lima"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      { wrapper },
    );

    expect(screen.getByText(/Personal: Beatriz Lima/)).toBeInTheDocument();
  });

  it("shows drag handles for every exercise when canEdit is true", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={true}
      />,
      {
        wrapper,
      },
    );

    expect(screen.getAllByLabelText("Reordenar exercício")).toHaveLength(2);
  });

  it("hides drag handles when canEdit is false", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    expect(screen.queryAllByLabelText("Reordenar exercício")).toHaveLength(0);
  });

  it("displays sequential numbering (#1, #2, …) based on position order", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("shows unarchive button when canUnarchive is true", () => {
    const archivedWorkout: Workout = { ...mockWorkout, status: "archived" };
    render(
      <TreinoCard
        treino={archivedWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
        canUnarchive={true}
      />,
      { wrapper },
    );

    expect(screen.getByLabelText("Reativar treino")).toBeInTheDocument();
  });

  it("hides unarchive button when canUnarchive is false", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    expect(screen.queryByLabelText("Reativar treino")).not.toBeInTheDocument();
  });

  it("shows delete button when canDelete is true", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
        canDelete
      />,
      { wrapper },
    );

    expect(screen.getByLabelText("Remover treino")).toBeInTheDocument();
  });

  it("hides delete button when canDelete is false", () => {
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    expect(screen.queryByLabelText("Remover treino")).not.toBeInTheDocument();
  });

  it("deletes the workout after confirming the removal dialog", async () => {
    const user = userEvent.setup();
    render(
      <TreinoCard
        treino={mockWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
        canDelete
      />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Remover treino"));
    await user.click(await screen.findByRole("button", { name: "Remover" }));

    expect(mockDeleteWorkout).toHaveBeenCalledWith("s1", "w1");
  });

  it("shows empty state when workout has no exercises", () => {
    const emptyWorkout: Workout = { ...mockWorkout, exercises: [] };
    render(
      <TreinoCard
        treino={emptyWorkout}
        alunoId="s1"
        trainerName="Rafael Monteiro"
        onWatch={vi.fn()}
        canEdit={false}
      />,
      {
        wrapper,
      },
    );

    expect(screen.getByText("Nenhum exercício neste treino ainda.")).toBeInTheDocument();
  });

  describe("copiar treino", () => {
    it("shows the copy button when canEdit is true", () => {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      expect(screen.getByLabelText("Copiar treino")).toBeInTheDocument();
    });

    it("shows the copy button when canUnarchive is true, even though the workout is read-only", () => {
      const archivedWorkout: Workout = { ...mockWorkout, status: "archived" };
      render(
        <TreinoCard
          treino={archivedWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
          canUnarchive={true}
        />,
        { wrapper },
      );

      expect(screen.getByLabelText("Copiar treino")).toBeInTheDocument();
    });

    it("hides the copy button when neither canEdit nor canUnarchive is true", () => {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        {
          wrapper,
        },
      );

      expect(screen.queryByLabelText("Copiar treino")).not.toBeInTheDocument();
    });

    it("writes the workout to the clipboard and shows a confirmation toast", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByLabelText("Copiar treino"));

      const stored = JSON.parse(window.localStorage.getItem("cfl:workout-clipboard:v1")!);
      expect(stored.sourceStudentId).toBe("s1");
      expect(stored.title).toBe(mockWorkout.title);
      expect(stored.exercises).toHaveLength(2);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(`Treino "${mockWorkout.title}" copiado`),
      );
    });
  });

  describe("observação do personal (exercise notes)", () => {
    it("shows the trainer's note for a strength exercise", () => {
      const workout: Workout = {
        ...mockWorkout,
        exercises: [{ ...mockWorkout.exercises[0], notes: "Controlar a fase excêntrica." }],
      };
      render(
        <TreinoCard
          treino={workout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(screen.getByText("Observação do Personal")).toBeInTheDocument();
      expect(screen.getByText("Controlar a fase excêntrica.")).toBeInTheDocument();
    });

    it("shows the trainer's note for cardio and mobility exercises", () => {
      const cardioExercise: Exercise = {
        id: "e3",
        position: 1,
        kind: "cardio",
        name: "Corrida na esteira",
        duration_seconds: 1200,
        video_url: "",
        notes: "Manter ritmo constante.",
      };
      const mobilityExercise: Exercise = {
        id: "e4",
        position: 2,
        kind: "mobility",
        name: "Alongamento de quadril",
        sets: 2,
        reps: "10",
        video_url: "",
        notes: "Não forçar além do conforto.",
      };
      render(
        <TreinoCard
          treino={{ ...mockWorkout, exercises: [cardioExercise, mobilityExercise] }}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(screen.getByText("Manter ritmo constante.")).toBeInTheDocument();
      expect(screen.getByText("Não forçar além do conforto.")).toBeInTheDocument();
    });

    it("does not render the notes block when the exercise has no note", () => {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(screen.queryByText("Observação do Personal")).not.toBeInTheDocument();
    });

    it("toggles between 'Ver mais' and 'Ver menos' for a note that overflows the preview", async () => {
      const user = userEvent.setup();
      const workout: Workout = {
        ...mockWorkout,
        exercises: [{ ...mockWorkout.exercises[0], notes: "Nota longa que ultrapassa o preview." }],
      };

      // jsdom não calcula layout real; o componente decide se o texto
      // ultrapassa 2 linhas comparando scrollHeight × clientHeight no mount,
      // então o stub precisa existir antes da primeira renderização.
      const scrollHeightSpy = vi
        .spyOn(HTMLElement.prototype, "scrollHeight", "get")
        .mockReturnValue(40);
      const clientHeightSpy = vi
        .spyOn(HTMLElement.prototype, "clientHeight", "get")
        .mockReturnValue(20);

      render(
        <TreinoCard
          treino={workout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      const toggle = await screen.findByRole("button", { name: /ver mais/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await user.click(toggle);
      expect(screen.getByRole("button", { name: /ver menos/i })).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      scrollHeightSpy.mockRestore();
      clientHeightSpy.mockRestore();
    });
  });

  describe("cardio and mobility exercises", () => {
    const cardioExercise: Exercise = {
      id: "e3",
      position: 1,
      kind: "cardio",
      name: "Corrida na esteira",
      duration_seconds: 1200,
      distance_value: 5,
      distance_unit: "km",
      hr_zone: 2,
      video_url: "",
    };
    const mobilityExercise: Exercise = {
      id: "e4",
      position: 2,
      kind: "mobility",
      name: "Alongamento de quadril",
      sets: 2,
      reps: "10",
      video_url: "",
    };
    const cardioMobilityWorkout: Workout = {
      ...mockWorkout,
      exercises: [cardioExercise, mobilityExercise],
    };

    it("renders a cardio exercise with its badge, duration and distance", () => {
      render(
        <TreinoCard
          treino={cardioMobilityWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(screen.getByText("Cardio")).toBeInTheDocument();
      expect(screen.getByText("20:00")).toBeInTheDocument();
      expect(screen.getByText("5 km")).toBeInTheDocument();
    });

    it("renders a mobility exercise with its badge and sets × reps", () => {
      render(
        <TreinoCard
          treino={cardioMobilityWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(screen.getByText("Mobilidade")).toBeInTheDocument();
      expect(screen.getByText("2×10")).toBeInTheDocument();
    });

    it("creates a cardio exercise via the 'Adicionar cardio' dialog", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByPlaceholderText("Ex.: Corrida na esteira"),
        "Corrida da manhã",
      );
      await user.click(within(dialog).getByRole("button", { name: "Adicionar" }));

      expect(mockCreateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        expect.objectContaining({
          kind: "cardio",
          name: "Corrida da manhã",
          duration_seconds: 600,
          hr_zone: null,
        }),
      );
    });

    // "Zona / Intensidade" e "km" são dois <Select> distintos sem label
    // associado via htmlFor (mesmo gap do Field documentado em outros
    // arquivos) — escopamos pelo container do label pra pegar o combobox certo.
    function zonaComboboxIn(container: HTMLElement) {
      const label = within(container).getByText("Zona / Intensidade");
      return within(label.parentElement!).getByRole("combobox");
    }

    it("lets the user pick a heart rate zone when adding cardio", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByPlaceholderText("Ex.: Corrida na esteira"),
        "Corrida da manhã",
      );
      await user.click(zonaComboboxIn(dialog));
      await user.click(await screen.findByRole("option", { name: "Zona 3" }));
      await user.click(within(dialog).getByRole("button", { name: "Adicionar" }));

      expect(mockCreateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        expect.objectContaining({ hr_zone: 3 }),
      );
    });

    it("clears a previously selected heart rate zone when editing cardio, sending null (not omitting the key)", async () => {
      // Regression test: PATCH must send `hr_zone: null` explicitly. Omitting
      // the key entirely (e.g. via `undefined`, dropped by JSON.stringify)
      // means "don't touch this column" server-side, so a workout that
      // already had a zone silently kept its old value instead of clearing —
      // reported after the zone reverted to "Zona 2" post-save in production.
      const user = userEvent.setup();
      const cardioWorkout: Workout = { ...mockWorkout, exercises: [cardioExercise] };
      render(
        <TreinoCard
          treino={cardioWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByLabelText("Editar exercício"));
      const dialog = await screen.findByRole("dialog");
      await user.click(zonaComboboxIn(dialog));
      await user.click(await screen.findByRole("option", { name: "Nenhuma" }));
      await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

      // objectContaining({ hr_zone: null }) fails if the key is merely
      // omitted (the original bug) — it requires the property to be present
      // and strictly equal to null, not just absent/undefined.
      expect(mockUpdateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        "e3",
        expect.objectContaining({ hr_zone: null }),
      );
    });

    it("accepts a heart rate range like '133 - 150' instead of a single number", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByPlaceholderText("Ex.: Corrida na esteira"),
        "Corrida da manhã",
      );
      await user.type(within(dialog).getByPlaceholderText("Ex.: 145 ou 133 - 150"), "133 - 150");
      await user.click(within(dialog).getByRole("button", { name: "Adicionar" }));

      expect(mockCreateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        expect.objectContaining({ heart_rate_bpm: "133 - 150" }),
      );
    });

    it("creates a mobility exercise via the 'Adicionar mobilidade' dialog", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar mobilidade" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByPlaceholderText("Ex.: Alongamento de quadril"),
        "Alongamento de ombro",
      );
      await user.click(within(dialog).getByRole("button", { name: "Adicionar" }));

      expect(mockCreateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        expect.objectContaining({
          kind: "mobility",
          name: "Alongamento de ombro",
          sets: 2,
          reps: "10",
        }),
      );
    });

    it("disables submit for cardio without duration or distance", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByPlaceholderText("Ex.: Corrida na esteira"), "Corrida");
      await user.clear(within(dialog).getByPlaceholderText("Ex.: 20:00"));

      expect(within(dialog).getByRole("button", { name: "Adicionar" })).toBeDisabled();
      expect(mockCreateExercise).not.toHaveBeenCalled();
    });

    it("formats the cardio duration field correctly while digits are typed", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      const tempoInput = within(dialog).getByPlaceholderText("Ex.: 20:00");

      await user.clear(tempoInput);
      await user.type(tempoInput, "1000");

      expect(tempoInput).toHaveValue("10:00");
    });

    it("clears the cardio duration field when the value is selected and deleted", async () => {
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      const tempoInput = within(dialog).getByPlaceholderText("Ex.: 20:00");

      await user.clear(tempoInput);

      expect(tempoInput).toHaveValue("");
    });
  });

  describe("check-in", () => {
    const inProgressCheckIn: WorkoutCheckIn = {
      id: "ci1",
      workout_id: "w1",
      workout_title: "Treino A — Push",
      student_id: "s1",
      student_name: "Julia Ferreira",
      status: "in_progress",
      student_confirmed_at: "2026-07-12T10:00:00Z",
      personal_confirmed_at: null,
      exercises_completed: 1,
      exercises_total: 2,
      completed_exercise_ids: ["e1"],
      started_at: "2026-07-12T10:00:00Z",
      completed_at: null,
      viewed_at: null,
      pse: null,
      feedbacks: [],
    };

    it("shows 'Iniciar treino' when there is no check-in in progress", async () => {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByRole("button", { name: /Iniciar treino/i });
      expect(screen.queryByRole("button", { name: /Finalizar treino/i })).not.toBeInTheDocument();
    });

    it("starts a check-in when 'Iniciar treino' is clicked", async () => {
      mockStartCheckIn.mockResolvedValue(inProgressCheckIn);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Iniciar treino/i }));

      await waitFor(() => expect(mockStartCheckIn).toHaveBeenCalledWith("s1", "w1"));
    });

    it("shows progress and 'Finalizar treino' once a check-in is in progress", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByRole("button", { name: /Finalizar treino/i });
      expect(screen.getByText("1/2 concluídos")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Iniciar treino/i })).not.toBeInTheDocument();
    });

    it("toggles an exercise by clicking its icon, calling the mutation with the exercise id", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      mockToggleExerciseCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        exercises_completed: 2,
        completed_exercise_ids: ["e1", "e2"],
      });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      const toggle = await screen.findByRole("button", {
        name: /Marcar "Crucifixo" como concluído/i,
      });
      await waitFor(() => expect(toggle).toBeEnabled());
      await user.click(toggle);

      await waitFor(() =>
        expect(mockToggleExerciseCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1", "e2", true),
      );
    });

    it("marks the toggle icon pressed for an exercise already completed in this check-in", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByRole("button", { name: /Finalizar treino/i });
      const toggle = screen.getByRole("button", {
        name: /Desmarcar "Supino reto"/i,
      });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
    });

    it("disables toggle icons once the check-in is completed", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({ ...inProgressCheckIn, status: "completed" });
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      const toggle = await screen.findByRole("button", {
        name: /Marcar "Crucifixo" como concluído/i,
      });
      expect(toggle).toBeDisabled();
    });

    it("shows a tooltip explaining that the workout must be started before toggling an exercise", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(null);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      const toggle = await screen.findByRole("button", {
        name: /Marcar "Crucifixo" como concluído/i,
      });
      expect(toggle).toBeDisabled();

      await user.hover(toggle);
      await waitFor(() =>
        expect(
          screen.getAllByText(/Inicie o treino para marcar este exercício como concluído/i).length,
        ).toBeGreaterThan(0),
      );
    });

    it("shows the instruction to start the workout in the check-in card", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(null);
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      const startButton = await screen.findByRole("button", { name: /Iniciar treino/i });
      const checkInCard = startButton.closest("div[class*='border-dashed']");
      expect(checkInCard).toHaveTextContent(
        /Clique em .*Iniciar treino.* para marcar os exercícios concluídos/i,
      );
    });

    it("finishes the check-in when 'Finalizar treino' is confirmed", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      mockFinishCheckIn.mockResolvedValue({ ...inProgressCheckIn, status: "completed" });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Finalizar treino/i }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Finalizar" }));

      await waitFor(() => expect(mockFinishCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1"));
    });

    describe("captura da PSE", () => {
      it("opens the PSE dialog once 'Finalizar treino' completes the check-in", async () => {
        mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
        mockFinishCheckIn.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          pse: null,
        });
        const user = userEvent.setup();
        render(
          <TreinoCard
            treino={mockWorkout}
            alunoId="s1"
            trainerName="Rafael Monteiro"
            onWatch={vi.fn()}
            canEdit={false}
          />,
          { wrapper },
        );

        await user.click(await screen.findByRole("button", { name: /Finalizar treino/i }));
        const confirmDialog = await screen.findByRole("alertdialog");
        await user.click(within(confirmDialog).getByRole("button", { name: "Finalizar" }));

        await screen.findByRole("dialog", { name: /Como foi o esforço desse treino/i });
      });

      it("opens the PSE dialog when the last exercise auto-finishes the check-in", async () => {
        mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
        mockToggleExerciseCheckIn.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          exercises_completed: 2,
          completed_exercise_ids: ["e1", "e2"],
          pse: null,
        });
        const user = userEvent.setup();
        render(
          <TreinoCard
            treino={mockWorkout}
            alunoId="s1"
            trainerName="Rafael Monteiro"
            onWatch={vi.fn()}
            canEdit={false}
          />,
          { wrapper },
        );

        const toggle = await screen.findByRole("button", {
          name: /Marcar "Crucifixo" como concluído/i,
        });
        await waitFor(() => expect(toggle).toBeEnabled());
        await user.click(toggle);

        await screen.findByRole("dialog", { name: /Como foi o esforço desse treino/i });
      });

      it("does not open the PSE dialog for a check-in that already arrives completed", async () => {
        mockFetchCurrentCheckIn.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          pse: null,
        });
        render(
          <TreinoCard
            treino={mockWorkout}
            alunoId="s1"
            trainerName="Rafael Monteiro"
            onWatch={vi.fn()}
            canEdit={false}
          />,
          { wrapper },
        );

        await screen.findByText(/Treino já concluído hoje/i);
        expect(
          screen.queryByRole("dialog", { name: /Como foi o esforço desse treino/i }),
        ).not.toBeInTheDocument();
      });

      it("registers the PSE and closes the dialog on confirm", async () => {
        mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
        mockFinishCheckIn.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          pse: null,
        });
        mockUpdateCheckInPse.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          pse: 7,
        });
        const user = userEvent.setup();
        render(
          <TreinoCard
            treino={mockWorkout}
            alunoId="s1"
            trainerName="Rafael Monteiro"
            onWatch={vi.fn()}
            canEdit={false}
          />,
          { wrapper },
        );

        await user.click(await screen.findByRole("button", { name: /Finalizar treino/i }));
        const confirmDialog = await screen.findByRole("alertdialog");
        await user.click(within(confirmDialog).getByRole("button", { name: "Finalizar" }));

        const pseDialog = await screen.findByRole("dialog", {
          name: /Como foi o esforço desse treino/i,
        });
        await user.click(within(pseDialog).getByRole("radio", { name: /PSE 7 ·/ }));
        await user.click(within(pseDialog).getByRole("button", { name: "Confirmar" }));

        await waitFor(() =>
          expect(mockUpdateCheckInPse).toHaveBeenCalledWith("s1", "w1", "ci1", 7),
        );
        await waitFor(() =>
          expect(
            screen.queryByRole("dialog", { name: /Como foi o esforço desse treino/i }),
          ).not.toBeInTheDocument(),
        );
      });

      it("does not reopen the PSE dialog after 'Pular' for the same check-in", async () => {
        mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
        mockFinishCheckIn.mockResolvedValue({
          ...inProgressCheckIn,
          status: "completed",
          pse: null,
        });
        const user = userEvent.setup();
        render(
          <TreinoCard
            treino={mockWorkout}
            alunoId="s1"
            trainerName="Rafael Monteiro"
            onWatch={vi.fn()}
            canEdit={false}
          />,
          { wrapper },
        );

        await user.click(await screen.findByRole("button", { name: /Finalizar treino/i }));
        const confirmDialog = await screen.findByRole("alertdialog");
        await user.click(within(confirmDialog).getByRole("button", { name: "Finalizar" }));

        const pseDialog = await screen.findByRole("dialog", {
          name: /Como foi o esforço desse treino/i,
        });
        await user.click(within(pseDialog).getByRole("button", { name: "Pular" }));

        await waitFor(() =>
          expect(
            screen.queryByRole("dialog", { name: /Como foi o esforço desse treino/i }),
          ).not.toBeInTheDocument(),
        );
        expect(mockUpdateCheckInPse).not.toHaveBeenCalled();
      });
    });

    it("toggles the set clock between running and paused, and resets it", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");
      // Crucifixo (e2) is the active slide — e1 is already completed, and
      // every exercise renders its own (mostly idle) slide in the carousel,
      // so timer assertions must be scoped to the active one.
      const activeSlide = within(dialog).getByRole("group", { name: "Crucifixo" });

      await user.click(within(dialog).getByRole("button", { name: /Iniciar série/i }));
      expect(within(activeSlide).getByText("Executando")).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(3000);
      expect(within(activeSlide).getByText("00:03")).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Parar" }));
      expect(within(activeSlide).getByText("Pausado")).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Retomar" })).toBeInTheDocument();

      // the clock stays frozen while paused
      await vi.advanceTimersByTimeAsync(3000);
      expect(within(activeSlide).getByText("00:03")).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Zerar cronômetro" }));
      expect(within(activeSlide).getByText("00:00")).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Retomar" }));
      expect(within(activeSlide).getByText("Executando")).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("navigates between the other exercise cards with the header arrows", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");

      // e1 (Supino reto) is already completed, so the dialog opens on e2
      // (Crucifixo) — the first pending exercise.
      expect(within(dialog).getByText("Crucifixo")).toBeInTheDocument();
      expect(within(dialog).getByText(/Exercício 2 de 2/)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Próximo exercício" })).toBeDisabled();

      await user.click(within(dialog).getByRole("button", { name: "Exercício anterior" }));
      expect(within(dialog).getByText("Supino reto")).toBeInTheDocument();
      expect(within(dialog).getByText(/Exercício 1 de 2/)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Exercício anterior" })).toBeDisabled();

      await user.click(within(dialog).getByRole("button", { name: "Próximo exercício" }));
      expect(within(dialog).getByText("Crucifixo")).toBeInTheDocument();
      expect(within(dialog).getByText(/Exercício 2 de 2/)).toBeInTheDocument();
    });

    it("keeps the started exercise's clock running while browsing other cards, and blocks starting a second one", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        completed_exercise_ids: [],
      });
      // Only "Supino reto" (e1) gets completed in this test — "Crucifixo"
      // (e2) must stay pending so it keeps offering "Iniciar série" instead
      // of "Reiniciar série" once we navigate to it.
      mockToggleExerciseCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        exercises_completed: 1,
        completed_exercise_ids: ["e1"],
      });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");

      // Opens on Supino reto (e1) — nothing completed yet.
      expect(within(dialog).getByText("Supino reto")).toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: /Iniciar série 1/i }));
      const supinoSlide = within(dialog).getByRole("group", { name: "Supino reto" });
      expect(within(supinoSlide).getByText("Executando")).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(3000);
      expect(within(supinoSlide).getByText("00:03")).toBeInTheDocument();

      // Navigate away — the running clock must not stop or reset.
      await user.click(within(dialog).getByRole("button", { name: "Próximo exercício" }));
      expect(within(dialog).getByText("Crucifixo")).toBeInTheDocument();

      // "Iniciar série" lives in the footer (shared across slides, acts on
      // whichever exercise is currently viewed), not inside the slide itself.
      expect(within(dialog).getByRole("button", { name: /Iniciar série 1/i })).toBeDisabled();
      expect(within(dialog).getByText(/Conclua "Supino reto"/)).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(2000);

      await user.click(within(dialog).getByRole("button", { name: "Exercício anterior" }));
      expect(within(dialog).getByText("Supino reto")).toBeInTheDocument();
      expect(within(supinoSlide).getByText("Executando")).toBeInTheDocument();
      expect(within(supinoSlide).getByText("00:05")).toBeInTheDocument();

      // Completing the started exercise frees up the other one.
      await user.click(within(dialog).getByRole("button", { name: /Concluir exercício/i }));
      expect(within(dialog).getByText("Crucifixo")).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: /Iniciar série 1/i })).not.toBeDisabled();

      vi.useRealTimers();
    });

    it("marks an already-completed exercise as done when navigating back to it, offering to restart instead of concluding it again", async () => {
      // e1 (Supino reto) is already completed per inProgressCheckIn; the
      // dialog opens on the first pending exercise (e2/Crucifixo).
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Crucifixo")).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Exercício anterior" }));
      const supinoSlide = within(dialog).getByRole("group", { name: "Supino reto" });

      // Visual state reflects completion, not the idle default.
      expect(within(supinoSlide).getByText("Concluído")).toBeInTheDocument();
      expect(within(supinoSlide).getByText("4/4")).toBeInTheDocument();

      // Neither "iniciar" nor "concluir" make sense on a finished exercise
      // (the regex is anchored so it doesn't also match "Reiniciar série").
      expect(
        within(dialog).queryByRole("button", { name: /^Iniciar série/i }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: /Concluir exercício/i }),
      ).not.toBeInTheDocument();

      mockToggleExerciseCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        exercises_completed: 0,
        completed_exercise_ids: [],
      });
      await user.click(within(dialog).getByRole("button", { name: /Reiniciar série/i }));

      await waitFor(() =>
        expect(mockToggleExerciseCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1", "e1", false),
      );
    });

    it("opens the execution dialog focused on the exercise that was clicked", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByRole("button", { name: /Retomar execução/i });
      // Clicking the (already completed) Supino reto row directly must open
      // on Supino reto, not the default first-pending exercise (Crucifixo).
      await user.click(screen.getByRole("button", { name: /Abrir execução de "Supino reto"/i }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("group", { name: "Supino reto" })).toBeInTheDocument();
    });

    it("does not open the execution dialog when clicking the row's toggle icon", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      mockToggleExerciseCheckIn.mockResolvedValue(inProgressCheckIn);
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(
        await screen.findByRole("button", { name: /Marcar "Crucifixo" como concluído/i }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not make exercise rows clickable before the workout is started", async () => {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByRole("button", { name: /Iniciar treino/i });
      expect(screen.queryByRole("button", { name: /Abrir execução de/i })).not.toBeInTheDocument();
    });

    it("shows 'já concluído hoje' and hides 'Iniciar treino' when the check-in is completed", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
      });
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByText("Treino já concluído hoje (1/2)");
      expect(screen.queryByRole("button", { name: /^Iniciar treino/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover check-in" })).toBeInTheDocument();
    });

    it("removes the check-in after confirming, letting the workout be started again", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
      });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByText("Treino já concluído hoje (1/2)");
      await user.click(screen.getByRole("button", { name: "Remover check-in" }));
      const confirmDialog = await screen.findByRole("alertdialog");
      await user.click(within(confirmDialog).getByRole("button", { name: "Remover" }));

      await waitFor(() => expect(mockDeleteCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1"));
      expect(toast.success).toHaveBeenCalledWith("Check-in removido");
    });

    it("shows an error toast when removing the check-in fails", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
      });
      mockDeleteCheckIn.mockRejectedValue(new Error("network error"));
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByText("Treino já concluído hoje (1/2)");
      await user.click(screen.getByRole("button", { name: "Remover check-in" }));
      const confirmDialog = await screen.findByRole("alertdialog");
      await user.click(within(confirmDialog).getByRole("button", { name: "Remover" }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Não foi possível remover o check-in"),
      );
    });

    it("shows a badge and no confirm button for a completed check-in the aluno performed themselves, viewed as the aluno", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:30:00Z",
        personal_confirmed_at: null,
      });
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByText("Feito pelo aluno");
      expect(screen.queryByRole("button", { name: /Confirmar check-in/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover check-in" })).toBeInTheDocument();
    });

    it("lets a personal confirm a check-in the aluno performed themselves", async () => {
      mockUseAuth.mockReturnValue(buildAuth({ canWrite: true, hasRole: vi.fn(() => true) }));
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:30:00Z",
        personal_confirmed_at: null,
      });
      mockConfirmCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:30:00Z",
        personal_confirmed_at: "2026-07-12T10:31:00Z",
      });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: /Confirmar check-in/i }));

      await waitFor(() => {
        expect(mockConfirmCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1");
        expect(toast.success).toHaveBeenCalledWith(
          "Check-in confirmado — agora conta no ciclo de atendimento",
        );
      });
    });

    it("lets the aluno confirm a check-in the personal performed on their behalf", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: null,
        personal_confirmed_at: "2026-07-12T10:30:00Z",
      });
      mockConfirmCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:31:00Z",
        personal_confirmed_at: "2026-07-12T10:30:00Z",
      });
      const user = userEvent.setup();
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await user.click(await screen.findByRole("button", { name: "Confirmar meu check-in" }));

      await waitFor(() => {
        expect(mockConfirmCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1");
        expect(toast.success).toHaveBeenCalledWith("Check-in confirmado");
      });
    });

    it("hides the remove button from the aluno once the personal has confirmed the check-in", async () => {
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:30:00Z",
        personal_confirmed_at: "2026-07-12T10:30:00Z",
      });
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      await screen.findByText("Treino já concluído hoje (1/2)");
      expect(screen.queryByText("Feito pelo aluno")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Remover check-in" })).not.toBeInTheDocument();
    });

    it("still lets a personal remove a check-in they performed, viewing via impersonation", async () => {
      mockUseAuth.mockReturnValue(buildAuth({ canWrite: true, hasRole: vi.fn(() => true) }));
      mockFetchCurrentCheckIn.mockResolvedValue({
        ...inProgressCheckIn,
        status: "completed",
        completed_at: "2026-07-12T10:30:00Z",
        student_confirmed_at: "2026-07-12T10:30:00Z",
        personal_confirmed_at: "2026-07-12T10:30:00Z",
      });
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );

      expect(await screen.findByRole("button", { name: "Remover check-in" })).toBeInTheDocument();
    });
  });

  describe("editing the load from the execution screen", () => {
    const inProgressCheckIn: WorkoutCheckIn = {
      id: "ci1",
      workout_id: "w1",
      workout_title: "Treino A — Push",
      student_id: "s1",
      student_name: "Julia Ferreira",
      status: "in_progress",
      student_confirmed_at: "2026-07-12T10:00:00Z",
      personal_confirmed_at: null,
      exercises_completed: 0,
      exercises_total: 2,
      completed_exercise_ids: [],
      started_at: "2026-07-12T10:00:00Z",
      completed_at: null,
      viewed_at: null,
      pse: null,
      feedbacks: [],
    };

    // The carousel renders every slide in the DOM at once (Embla), so
    // queries must be scoped to the "Supino reto" slide — otherwise
    // "Editar carga" matches both exercises' buttons.
    async function openSupinoSlide(user: ReturnType<typeof userEvent.setup>, treino = mockWorkout) {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      render(
        <TreinoCard
          treino={treino}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );
      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");
      return within(dialog).getByRole("group", { name: "Supino reto" });
    }

    it("saves the new load on blur", async () => {
      mockUpdateExercise.mockResolvedValue({ ...mockWorkout.exercises[1], load_kg: 25 });
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user);

      await user.click(within(slide).getByRole("button", { name: /Editar carga/i }));
      const input = within(slide).getByLabelText("Carga em quilos");
      await user.type(input, "25");
      await user.tab();

      await waitFor(() =>
        expect(mockUpdateExercise).toHaveBeenCalledWith("s1", "w1", "e1", { load_kg: 25 }),
      );
    });

    it("saves on Enter too", async () => {
      mockUpdateExercise.mockResolvedValue({ ...mockWorkout.exercises[1], load_kg: 30 });
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user);

      await user.click(within(slide).getByRole("button", { name: /Editar carga/i }));
      await user.type(within(slide).getByLabelText("Carga em quilos"), "30{Enter}");

      await waitFor(() =>
        expect(mockUpdateExercise).toHaveBeenCalledWith("s1", "w1", "e1", { load_kg: 30 }),
      );
    });

    it("discards the edit on Escape without saving", async () => {
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user);

      await user.click(within(slide).getByRole("button", { name: /Editar carga/i }));
      await user.type(within(slide).getByLabelText("Carga em quilos"), "40{Escape}");

      expect(mockUpdateExercise).not.toHaveBeenCalled();
    });

    it("clears the load when the input is emptied", async () => {
      const loadedWorkout: Workout = {
        ...mockWorkout,
        exercises: mockWorkout.exercises.map((e) => (e.id === "e1" ? { ...e, load_kg: 20 } : e)),
      };
      mockUpdateExercise.mockResolvedValue({ ...loadedWorkout.exercises[1], load_kg: null });
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user, loadedWorkout);

      await user.click(within(slide).getByRole("button", { name: /Editar carga/i }));
      const input = within(slide).getByLabelText("Carga em quilos");
      await user.clear(input);
      await user.tab();

      await waitFor(() =>
        expect(mockUpdateExercise).toHaveBeenCalledWith("s1", "w1", "e1", { load_kg: null }),
      );
    });

    it("shows an error toast when saving the load fails", async () => {
      mockUpdateExercise.mockRejectedValue(new Error("network error"));
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user);

      await user.click(within(slide).getByRole("button", { name: /Editar carga/i }));
      await user.type(within(slide).getByLabelText("Carga em quilos"), "25{Enter}");

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar a carga"),
      );
    });
  });

  describe("tip and video access from the execution screen", () => {
    const inProgressCheckIn: WorkoutCheckIn = {
      id: "ci1",
      workout_id: "w1",
      workout_title: "Treino A — Push",
      student_id: "s1",
      student_name: "Julia Ferreira",
      status: "in_progress",
      student_confirmed_at: "2026-07-12T10:00:00Z",
      personal_confirmed_at: null,
      exercises_completed: 0,
      exercises_total: 2,
      completed_exercise_ids: [],
      started_at: "2026-07-12T10:00:00Z",
      completed_at: null,
      viewed_at: null,
      pse: null,
      feedbacks: [],
    };

    async function openSupinoSlide(user: ReturnType<typeof userEvent.setup>, treino: Workout) {
      mockFetchCurrentCheckIn.mockResolvedValue(inProgressCheckIn);
      render(
        <TreinoCard
          treino={treino}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={false}
        />,
        { wrapper },
      );
      await user.click(await screen.findByRole("button", { name: /Retomar execução/i }));
      const dialog = await screen.findByRole("dialog");
      return within(dialog).getByRole("group", { name: "Supino reto" });
    }

    it("does not show the personal's tip text within the execution screen until asked for", async () => {
      const workout: Workout = {
        ...mockWorkout,
        exercises: mockWorkout.exercises.map((e) =>
          e.id === "e1" ? { ...e, notes: "Controlar a fase excêntrica." } : e,
        ),
      };
      const user = userEvent.setup();
      // The underlying workout list (behind the dialog) already shows its own
      // note preview per exercise — scoped to `slide` so that pre-existing
      // display isn't mistaken for the execution screen's own tip text.
      const slide = await openSupinoSlide(user, workout);

      expect(within(slide).getByRole("button", { name: /Dica do personal/i })).toBeInTheDocument();
      expect(within(slide).queryByText("Controlar a fase excêntrica.")).not.toBeInTheDocument();
    });

    it("reveals the tip in a popover when its button is clicked", async () => {
      const workout: Workout = {
        ...mockWorkout,
        exercises: mockWorkout.exercises.map((e) =>
          e.id === "e1" ? { ...e, notes: "Controlar a fase excêntrica." } : e,
        ),
      };
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user, workout);
      // Only one copy of the note exists yet (the workout list's own preview,
      // behind the dialog) — the popover portals outside `slide`, so opening
      // it is asserted by a second copy of the text appearing.
      expect(screen.getAllByText("Controlar a fase excêntrica.")).toHaveLength(1);

      await user.click(within(slide).getByRole("button", { name: /Dica do personal/i }));

      await waitFor(() =>
        expect(screen.getAllByText("Controlar a fase excêntrica.")).toHaveLength(2),
      );
    });

    it("does not show a tip button when the exercise has no notes", async () => {
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user, mockWorkout);

      expect(
        within(slide).queryByRole("button", { name: /Dica do personal/i }),
      ).not.toBeInTheDocument();
    });

    it("opens the exercise video in a dialog when 'Ver execução' is clicked", async () => {
      const workout: Workout = {
        ...mockWorkout,
        exercises: mockWorkout.exercises.map((e) =>
          e.id === "e1" ? { ...e, video_url: "https://www.youtube.com/embed/abc123" } : e,
        ),
      };
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user, workout);

      await user.click(within(slide).getByRole("button", { name: /Ver execução/i }));

      expect(await screen.findByTitle("Supino reto")).toBeInTheDocument();
    });

    it("does not show a video button when the exercise has no video", async () => {
      const user = userEvent.setup();
      const slide = await openSupinoSlide(user, mockWorkout);

      expect(
        within(slide).queryByRole("button", { name: /Ver execução/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("editing a strength exercise's numeric fields", () => {
    // Field/Label aren't linked via htmlFor, so number inputs can't be found
    // by label text directly — scope to the Field's wrapper div instead.
    function numberFieldFor(container: HTMLElement, label: string): HTMLInputElement {
      const labelEl = within(container).getByText(label);
      return within(labelEl.parentElement!).getByRole("spinbutton") as HTMLInputElement;
    }

    async function openEditDialogForSupinoReto(user: ReturnType<typeof userEvent.setup>) {
      render(
        <TreinoCard
          treino={mockWorkout}
          alunoId="s1"
          trainerName="Rafael Monteiro"
          onWatch={vi.fn()}
          canEdit={true}
        />,
        {
          wrapper,
        },
      );
      // Sorted by position — Supino reto (position 1) renders before Crucifixo (position 2).
      await user.click(screen.getAllByLabelText("Editar exercício")[0]);
      return screen.findByRole("dialog");
    }

    it("clears to empty instead of a stuck '0' when Descanso is cleared", async () => {
      const user = userEvent.setup();
      const dialog = await openEditDialogForSupinoReto(user);

      const descanso = numberFieldFor(dialog, "Descanso (s)");
      expect(descanso.value).toBe("90");

      await user.clear(descanso);
      expect(descanso.value).toBe("");

      await user.type(descanso, "33");
      expect(descanso.value).toBe("33");
    });

    it("clears to empty instead of a stuck '1' when Séries is cleared", async () => {
      const user = userEvent.setup();
      const dialog = await openEditDialogForSupinoReto(user);

      const series = numberFieldFor(dialog, "Séries");
      expect(series.value).toBe("4");

      await user.clear(series);
      expect(series.value).toBe("");

      await user.type(series, "5");
      expect(series.value).toBe("5");
    });

    it("saves an empty Descanso as omitted (not 0) so the backend keeps its own default", async () => {
      const user = userEvent.setup();
      const dialog = await openEditDialogForSupinoReto(user);

      await user.clear(numberFieldFor(dialog, "Descanso (s)"));
      await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

      expect(mockUpdateExercise).toHaveBeenCalledWith(
        "s1",
        "w1",
        "e1",
        expect.objectContaining({ rest_seconds: undefined }),
      );
    });
  });
});
