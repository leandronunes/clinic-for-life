import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColarTreinoButton } from "./colar-treino-button";
import type { Workout } from "@/lib/api/workouts";
import { createExercise, createWorkout } from "@/lib/api/workouts";
import { workoutToClipboard } from "@/hooks/use-workout-clipboard";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return {
    ...actual,
    createWorkout: vi.fn(),
    createExercise: vi.fn(),
  };
});

const mockCreateExercise = vi.mocked(createExercise);
const mockCreateWorkout = vi.mocked(createWorkout);

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
