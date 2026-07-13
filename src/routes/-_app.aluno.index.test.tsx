import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TreinoCard, ColarTreinoButton } from "./_app.aluno.index";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Exercise, Workout } from "@/lib/api/workouts";
import { createExercise, createWorkout, deleteWorkout, updateExercise } from "@/lib/api/workouts";
import { workoutToClipboard } from "@/hooks/use-workout-clipboard";
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
const mockCreateWorkout = vi.mocked(createWorkout);
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
}));
import {
  fetchCurrentCheckIn,
  startCheckIn,
  finishCheckIn,
  toggleExerciseCheckIn,
  type WorkoutCheckIn,
} from "@/lib/api/check-ins";
const mockFetchCurrentCheckIn = vi.mocked(fetchCurrentCheckIn);
const mockStartCheckIn = vi.mocked(startCheckIn);
const mockFinishCheckIn = vi.mocked(finishCheckIn);
const mockToggleExerciseCheckIn = vi.mocked(toggleExerciseCheckIn);

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
      exercises_completed: 1,
      exercises_total: 2,
      completed_exercise_ids: ["e1"],
      started_at: "2026-07-12T10:00:00Z",
      completed_at: null,
      viewed_at: null,
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

function seedClipboard(sourceStudentId: string, sourceStudentLabel?: string) {
  const clip = workoutToClipboard(mockWorkout, sourceStudentId, sourceStudentLabel);
  window.localStorage.setItem("cfl:workout-clipboard:v1", JSON.stringify(clip));
  return clip;
}

describe("ColarTreinoButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockCreateWorkout.mockResolvedValue({ ...mockWorkout, id: "w-new" });
    mockCreateExercise.mockImplementation((_studentId, _workoutId, payload) =>
      Promise.resolve({ id: `new-${payload.name}`, position: 1, video_url: "", ...payload }),
    );
  });

  it("renders nothing when there is no clipboard", () => {
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    expect(screen.queryByText("Colar treino")).not.toBeInTheDocument();
  });

  it("renders the paste button with the exercise count badge when a clipboard exists", () => {
    seedClipboard("s1", "Júlia");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    expect(screen.getByText("Colar treino")).toBeInTheDocument();
    expect(screen.getByText("2 ex.")).toBeInTheDocument();
  });

  it("clears the clipboard via the X button", async () => {
    const user = userEvent.setup();
    seedClipboard("s1");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByLabelText("Limpar treino copiado"));

    expect(screen.queryByText("Colar treino")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("cfl:workout-clipboard:v1")).toBeNull();
  });

  it("pre-fills the dialog with the clipboard's title and focus", async () => {
    const user = userEvent.setup();
    seedClipboard("s1");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByDisplayValue(mockWorkout.title)).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(mockWorkout.focus)).toBeInTheDocument();
  });

  it("shows the same-student message when pasting into the workout's own source student", async () => {
    const user = userEvent.setup();
    seedClipboard("s2");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/será duplicado como um novo treino/)).toBeInTheDocument();
  });

  it("shows the generic message when pasting into a different student", async () => {
    const user = userEvent.setup();
    seedClipboard("s1");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/Um novo treino será criado neste aluno/)).toBeInTheDocument();
  });

  it("disables the submit button when the title is cleared", async () => {
    const user = userEvent.setup();
    seedClipboard("s1");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");
    await user.clear(within(dialog).getByDisplayValue(mockWorkout.title));

    expect(within(dialog).getByRole("button", { name: "Colar treino" })).toBeDisabled();
  });

  it("creates the workout and each exercise in position order, then reports success", async () => {
    const user = userEvent.setup();
    const onPasted = vi.fn();
    seedClipboard("s1", "Júlia");
    render(<ColarTreinoButton alunoId="s2" onPasted={onPasted} />, {
      wrapper,
    });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Colar treino" }));

    await waitFor(() =>
      expect(onPasted).toHaveBeenCalledWith(expect.objectContaining({ id: "w-new" })),
    );

    expect(mockCreateWorkout).toHaveBeenCalledWith("s2", {
      title: mockWorkout.title,
      focus: mockWorkout.focus,
    });
    // A ordem de chamada precisa respeitar a `position` original (Supino
    // reto=1 antes de Crucifixo=2), não a ordem do array de exercises.
    expect(mockCreateExercise.mock.calls[0]).toEqual([
      "s2",
      "w-new",
      expect.objectContaining({ name: "Supino reto" }),
    ]);
    expect(mockCreateExercise.mock.calls[1]).toEqual([
      "s2",
      "w-new",
      expect.objectContaining({ name: "Crucifixo" }),
    ]);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("2 exercícios"));
  });

  it("shows an error toast when the paste fails", async () => {
    const user = userEvent.setup();
    mockCreateWorkout.mockRejectedValue(new Error("network down"));
    seedClipboard("s1");
    render(<ColarTreinoButton alunoId="s2" />, { wrapper });

    await user.click(screen.getByText("Colar treino"));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Colar treino" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
