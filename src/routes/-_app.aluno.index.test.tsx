import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TreinoCard } from "./_app.aluno.index";
import type { Workout } from "@/lib/api/workouts";

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return {
    ...actual,
    archiveWorkout: vi.fn(),
    unarchiveWorkout: vi.fn(),
    reorderExercises: vi.fn().mockResolvedValue([]),
    reorderWorkouts: vi.fn().mockResolvedValue([]),
    createExercise: vi.fn(),
    updateExercise: vi.fn(),
    deleteExercise: vi.fn(),
  };
});

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
  beforeEach(() => vi.clearAllMocks());

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

  it("shows empty state when workout has no exercises", () => {
    const emptyWorkout: Workout = { ...mockWorkout, exercises: [] };
    render(<TreinoCard treino={emptyWorkout} alunoId="s1" onWatch={vi.fn()} canEdit={false} />, {
      wrapper,
    });

    expect(screen.getByText("Nenhum exercício neste treino ainda.")).toBeInTheDocument();
  });
});
