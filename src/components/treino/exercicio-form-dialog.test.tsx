import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExercicioFormDialog } from "./exercicio-form-dialog";
import type { Exercise } from "@/lib/api/workouts";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/workouts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/workouts")>();
  return { ...actual, createExercise: vi.fn(), updateExercise: vi.fn() };
});

import { createExercise, updateExercise } from "@/lib/api/workouts";
import { toast } from "sonner";

const mockCreateExercise = vi.mocked(createExercise);
const mockUpdateExercise = vi.mocked(updateExercise);

// useIsMobile (rendered inside ExercicioVideoInput) reads window.innerWidth,
// but calls window.matchMedia on mount — stub it so jsdom doesn't throw.
function stubMatchMedia() {
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

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderDialog(exercicio: Exercise) {
  const qc = makeQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ExercicioFormDialog
        mode="edit"
        kind="strength"
        treinoId="t1"
        alunoId="a1"
        exercicio={exercicio}
        trigger={<button>Editar</button>}
      />
    </QueryClientProvider>,
  );
}

const baseExercise: Exercise = {
  id: "e1",
  position: 0,
  kind: "strength",
  name: "Supino reto",
  sets: 3,
  reps: "10-12",
  load_kg: 20,
  rest_seconds: 60,
  muscle_group: "Peito",
  video_url: "",
  notes: "Manter cotovelos a 45 graus",
};

beforeEach(() => {
  vi.clearAllMocks();
  stubMatchMedia();
  mockUpdateExercise.mockResolvedValue({ ...baseExercise, notes: null });
  mockCreateExercise.mockResolvedValue(baseExercise);
});

describe("ExercicioFormDialog — edição de observação/descrição", () => {
  it("envia notes: null (não omite o campo) ao apagar a observação existente", async () => {
    const user = userEvent.setup();
    renderDialog(baseExercise);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");

    const notesField = within(dialog).getByPlaceholderText("Dica de execução (opcional)");
    expect(notesField).toHaveValue("Manter cotovelos a 45 graus");

    await user.clear(notesField);
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    expect(mockUpdateExercise).toHaveBeenCalledTimes(1);
    const [, , , payload] = mockUpdateExercise.mock.calls[0];
    expect(payload).toHaveProperty("notes", null);
    expect(toast.success).toHaveBeenCalled();
  });

  it("mantém o texto quando a observação não é alterada", async () => {
    const user = userEvent.setup();
    renderDialog(baseExercise);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    const [, , , payload] = mockUpdateExercise.mock.calls[0];
    expect(payload).toHaveProperty("notes", "Manter cotovelos a 45 graus");
  });

  it("mostra erro quando a atualização falha", async () => {
    mockUpdateExercise.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderDialog(baseExercise);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
