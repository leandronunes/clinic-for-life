import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TreinoCard } from "./_app.aluno.index";
import type { Exercise, Workout } from "@/lib/api/workouts";
import { createExercise, deleteWorkout, updateExercise } from "@/lib/api/workouts";

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return {
    ...actual,
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

const mockWorkout: Workout = {
  id: "w1",
  position: 1,
  title: "Treino A — Push",
  focus: "Empurrar",
  status: "active",
  created_at: "2026-01-01",
  trainer_name: "Rafael",
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
    mockCreateExercise.mockResolvedValue({ ...mockWorkout.exercises[0], id: "new" });
    mockDeleteWorkout.mockResolvedValue(null);
    mockUpdateExercise.mockResolvedValue(mockWorkout.exercises[1]);
  });

  it("renders exercises sorted by position regardless of array order", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    // mockWorkout has e2 (position=2) before e1 (position=1) in the array —
    // the component must reorder so position=1 (Supino reto) appears first.
    const nameSpans = screen.getAllByText(/Supino reto|Crucifixo/);
    expect(nameSpans[0].textContent).toBe("Supino reto");
    expect(nameSpans[1].textContent).toBe("Crucifixo");
  });

  it("shows drag handles for every exercise when canEdit is true", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
      wrapper,
    });

    expect(screen.getAllByLabelText("Reordenar exercício")).toHaveLength(2);
  });

  it("hides drag handles when canEdit is false", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.queryAllByLabelText("Reordenar exercício")).toHaveLength(0);
  });

  it("displays sequential numbering (#1, #2, …) based on position order", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("shows unarchive button when canUnarchive is true", () => {
    const archivedWorkout: Workout = { ...mockWorkout, status: "archived" };
    render(
      <TreinoCard
        treino={archivedWorkout}
        alunoId="s1"
        onWatch={vi.fn()}
        canEdit={false}
        canUnarchive={true}
      />,
      { wrapper },
    );

    expect(screen.getByLabelText("Reativar treino")).toBeInTheDocument();
  });

  it("hides unarchive button when canUnarchive is false", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("Reativar treino")).not.toBeInTheDocument();
  });

  it("shows delete button when canDelete is true", () => {
    render(
      <TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} canDelete />,
      { wrapper },
    );

    expect(screen.getByLabelText("Remover treino")).toBeInTheDocument();
  });

  it("hides delete button when canDelete is false", () => {
    render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("Remover treino")).not.toBeInTheDocument();
  });

  it("deletes the workout after confirming the removal dialog", async () => {
    const user = userEvent.setup();
    render(
      <TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} canDelete />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Remover treino"));
    await user.click(await screen.findByRole("button", { name: "Remover" }));

    expect(mockDeleteWorkout).toHaveBeenCalledWith("s1", "w1");
  });

  it("shows empty state when workout has no exercises", () => {
    const emptyWorkout: Workout = { ...mockWorkout, exercises: [] };
    render(<TreinoCard treino={emptyWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.getByText("Nenhum exercício neste treino ainda.")).toBeInTheDocument();
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
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });

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
          hr_zone: 2,
        }),
      );
    });

    it("creates a mobility exercise via the 'Adicionar mobilidade' dialog", async () => {
      const user = userEvent.setup();
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });

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
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByPlaceholderText("Ex.: Corrida na esteira"), "Corrida");
      await user.clear(within(dialog).getByPlaceholderText("Ex.: 20:00"));

      expect(within(dialog).getByRole("button", { name: "Adicionar" })).toBeDisabled();
      expect(mockCreateExercise).not.toHaveBeenCalled();
    });

    it("formats the cardio duration field correctly while digits are typed", async () => {
      const user = userEvent.setup();
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      const tempoInput = within(dialog).getByPlaceholderText("Ex.: 20:00");

      await user.clear(tempoInput);
      await user.type(tempoInput, "1000");

      expect(tempoInput).toHaveValue("10:00");
    });

    it("clears the cardio duration field when the value is selected and deleted", async () => {
      const user = userEvent.setup();
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });

      await user.click(screen.getByRole("button", { name: "Adicionar cardio" }));
      const dialog = await screen.findByRole("dialog");
      const tempoInput = within(dialog).getByPlaceholderText("Ex.: 20:00");

      await user.clear(tempoInput);

      expect(tempoInput).toHaveValue("");
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
      render(<TreinoCard treino={mockWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={true} />, {
        wrapper,
      });
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
