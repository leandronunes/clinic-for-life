import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecucaoTreinoDialog } from "./execucao-treino-dialog";
import type { Workout } from "@/lib/api/workouts";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/video-url", () => ({
  isUploadedVideo: vi.fn().mockReturnValue(false),
}));

const mockWorkout: Workout = {
  id: "w1",
  position: 1,
  title: "Treino A",
  focus: "Superior",
  status: "active",
  created_at: "2026-01-01",
  exercises: [
    {
      id: "e1",
      position: 1,
      name: "Supino reto",
      sets: 3,
      reps: "10",
      rest_seconds: 60,
      muscle_group: "Peito",
      video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      notes: "Mantenha os cotovelos a 45°.",
    },
  ],
};

const mockCheckIn: WorkoutCheckIn = {
  id: "c1",
  workout_id: "w1",
  workout_title: "Treino A",
  student_id: "s1",
  student_name: "Aluno",
  status: "in_progress",
  student_confirmed_at: "2026-01-01T10:00:00Z",
  personal_confirmed_at: null,
  exercises_completed: 0,
  exercises_total: 1,
  completed_exercise_ids: [],
  started_at: "2026-01-01T10:00:00Z",
  completed_at: null,
  viewed_at: null,
  pse: null,
  feedbacks: [],
};

function setupMatchMedia() {
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
}

describe("ExecucaoTreinoDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMatchMedia();
  });

  it("renders tertiary actions as icon-only buttons inside the timer frame", () => {
    render(
      <ExecucaoTreinoDialog
        open={true}
        onOpenChange={vi.fn()}
        treino={mockWorkout}
        checkIn={mockCheckIn}
        onToggleExercise={vi.fn()}
        onUpdateLoad={vi.fn()}
      />,
    );

    const dicaButton = screen.getByLabelText("Dica do personal");
    const videoButton = screen.getByLabelText("Ver execução");

    expect(dicaButton).toBeInTheDocument();
    expect(videoButton).toBeInTheDocument();

    // They should be icon-only: no visible text labels.
    expect(dicaButton.textContent).toBe("");
    expect(videoButton.textContent).toBe("");
  });

  it("opens the trainer tip popover when the dica button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExecucaoTreinoDialog
        open={true}
        onOpenChange={vi.fn()}
        treino={mockWorkout}
        checkIn={mockCheckIn}
        onToggleExercise={vi.fn()}
        onUpdateLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Dica do personal"));

    await waitFor(() => {
      expect(screen.getByText("Mantenha os cotovelos a 45°.")).toBeInTheDocument();
    });
  });

  it("opens the video dialog when the video button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ExecucaoTreinoDialog
        open={true}
        onOpenChange={vi.fn()}
        treino={mockWorkout}
        checkIn={mockCheckIn}
        onToggleExercise={vi.fn()}
        onUpdateLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Ver execução"));

    await waitFor(() => {
      expect(screen.getByTitle("Supino reto")).toBeInTheDocument();
    });
  });

  it("hides tertiary buttons when exercise has neither notes nor video", () => {
    const workoutWithoutResources: Workout = {
      ...mockWorkout,
      exercises: [{ ...mockWorkout.exercises[0], notes: "", video_url: "" }],
    };

    render(
      <ExecucaoTreinoDialog
        open={true}
        onOpenChange={vi.fn()}
        treino={workoutWithoutResources}
        checkIn={mockCheckIn}
        onToggleExercise={vi.fn()}
        onUpdateLoad={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Dica do personal")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ver execução")).not.toBeInTheDocument();
  });
});
