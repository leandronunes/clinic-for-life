import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { WorkoutCheckIn } from "@/lib/api/check-ins";
import { TreinosConcluidosPage } from "./_app.treinos-concluidos";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
  };
});

vi.mock("@/lib/api/check-ins", () => ({
  fetchCompletedCheckIns: vi.fn(),
  markCheckInViewed: vi.fn(),
}));
import { fetchCompletedCheckIns, markCheckInViewed } from "@/lib/api/check-ins";
const mockFetchCompleted = vi.mocked(fetchCompletedCheckIns);
const mockMarkViewed = vi.mocked(markCheckInViewed);

vi.mock("@/lib/api/check-in-feedbacks", () => ({
  createCheckInFeedback: vi.fn(),
  updateCheckInFeedback: vi.fn(),
  deleteCheckInFeedback: vi.fn(),
}));
import {
  createCheckInFeedback,
  updateCheckInFeedback,
  deleteCheckInFeedback,
} from "@/lib/api/check-in-feedbacks";
const mockCreateFeedback = vi.mocked(createCheckInFeedback);
const mockUpdateFeedback = vi.mocked(updateCheckInFeedback);
const mockDeleteFeedback = vi.mocked(deleteCheckInFeedback);

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

vi.mock("emoji-picker-react", () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button type="button" onClick={() => onEmojiClick({ emoji: "💪" })}>
      💪
    </button>
  ),
  EmojiStyle: { NATIVE: "native" },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function buildCheckIn(overrides: Partial<WorkoutCheckIn> = {}): WorkoutCheckIn {
  return {
    id: "ci1",
    workout_id: "w1",
    workout_title: "Treino A",
    student_id: "s1",
    student_name: "Júlia Ferreira",
    status: "completed",
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

describe("TreinosConcluidosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCompleted.mockResolvedValue([]);
    mockMarkViewed.mockResolvedValue(buildCheckIn({ viewed_at: "2026-07-13T09:00:00Z" }));
  });

  it("shows the empty state when there are no completed check-ins", async () => {
    render(<TreinosConcluidosPage />, { wrapper });

    await screen.findByText("Nenhum treino concluído ainda.");
  });

  it("marks a not-viewed check-in with a 'Novo' badge", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);

    render(<TreinosConcluidosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    expect(screen.getByText("Novo")).toBeInTheDocument();
  });

  it("marks a viewed check-in without a reaction with an eye icon", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ viewed_at: "2026-07-11T09:00:00Z" })]);

    render(<TreinosConcluidosPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    expect(screen.getByLabelText("Visualizado")).toBeInTheDocument();
    expect(screen.queryByText("Novo")).not.toBeInTheDocument();
  });

  it("marks a viewed check-in with a feedback by showing the emoji", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({
        viewed_at: "2026-07-11T09:00:00Z",
        feedbacks: [
          {
            id: "f1",
            workout_check_in_id: "ci1",
            emoji: "🔥",
            message: null,
            author_name: "Rafael Monteiro",
            created_at: "2026-07-11T09:00:00Z",
          },
        ],
      }),
    ]);

    render(<TreinosConcluidosPage />, { wrapper });

    const card = await screen.findByText("Júlia Ferreira");
    expect(within(card.closest("button")!).getByLabelText("Feedback enviado")).toHaveTextContent(
      "🔥",
    );
  });

  it("marks a not-yet-viewed check-in as viewed when its detail is opened", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));

    await waitFor(() => {
      expect(mockMarkViewed).toHaveBeenCalledWith("s1", "w1", "ci1");
    });
  });

  it("does not re-mark an already-viewed check-in", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ viewed_at: "2026-07-11T09:00:00Z" })]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");

    expect(mockMarkViewed).not.toHaveBeenCalled();
  });

  it("sends a feedback message for the selected check-in", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);
    mockCreateFeedback.mockResolvedValue({
      id: "f1",
      workout_check_in_id: "ci1",
      emoji: null,
      message: "Mandou muito bem!",
      author_name: "Rafael Monteiro",
      created_at: "2026-07-13T09:00:00Z",
    });
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/Mensagem/i), "Mandou muito bem!");
    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", {
        message: "Mandou muito bem!",
      });
      expect(toast.success).toHaveBeenCalledWith("Feedback enviado");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("sends an emoji reaction for the selected check-in", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);
    mockCreateFeedback.mockResolvedValue({
      id: "r1",
      workout_check_in_id: "ci1",
      emoji: "💪",
      message: null,
      author_name: "Rafael Monteiro",
      created_at: "2026-07-13T09:00:00Z",
    });
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Escolher emoji/i }));
    await user.click(screen.getByRole("button", { name: "💪" }));
    // emoji is selected but NOT yet submitted — "Enviar feedback" button must be clicked
    expect(mockCreateFeedback).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", { emoji: "💪" });
      expect(toast.success).toHaveBeenCalledWith("Feedback enviado");
    });
  });

  it("sends emoji and message together in a single feedback", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);
    mockCreateFeedback.mockResolvedValue({
      id: "f2",
      workout_check_in_id: "ci1",
      emoji: "💪",
      message: "Excelente execução!",
      author_name: "Rafael Monteiro",
      created_at: "2026-07-13T09:00:00Z",
    });
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Escolher emoji/i }));
    await user.click(screen.getByRole("button", { name: "💪" }));
    await user.type(screen.getByLabelText(/Mensagem/i), "Excelente execução!");
    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", {
        emoji: "💪",
        message: "Excelente execução!",
      });
      expect(toast.success).toHaveBeenCalledWith("Feedback enviado");
    });
  });

  function buildCheckInWithFeedback() {
    return buildCheckIn({
      viewed_at: "2026-07-11T09:00:00Z",
      feedbacks: [
        {
          id: "f-existing",
          workout_check_in_id: "ci1",
          emoji: "🔥",
          message: "Bom trabalho!",
          author_name: "Rafael Monteiro",
          created_at: "2026-07-11T09:00:00Z",
        },
      ],
    });
  }

  it("edits an existing feedback", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckInWithFeedback()]);
    mockUpdateFeedback.mockResolvedValue({
      id: "f-existing",
      workout_check_in_id: "ci1",
      emoji: "💪",
      message: "Atualizado!",
      author_name: "Rafael Monteiro",
      created_at: "2026-07-11T09:00:00Z",
    });
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Editar feedback/i }));
    // edit form should appear
    const textarea = screen.getByPlaceholderText("Mensagem…");
    await user.clear(textarea);
    await user.type(textarea, "Atualizado!");
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(mockUpdateFeedback).toHaveBeenCalledWith(
        "s1",
        "w1",
        "ci1",
        "f-existing",
        expect.objectContaining({ message: "Atualizado!" }),
      );
      expect(toast.success).toHaveBeenCalledWith("Feedback atualizado");
    });
  });

  it("cancels editing without saving", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckInWithFeedback()]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Editar feedback/i }));
    expect(screen.getByPlaceholderText("Mensagem…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(screen.queryByPlaceholderText("Mensagem…")).not.toBeInTheDocument();
    expect(mockUpdateFeedback).not.toHaveBeenCalled();
  });

  it("deletes an existing feedback", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckInWithFeedback()]);
    mockDeleteFeedback.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByText("Júlia Ferreira"));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Remover feedback/i }));

    await waitFor(() => {
      expect(mockDeleteFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", "f-existing");
      expect(toast.success).toHaveBeenCalledWith("Feedback removido");
    });
  });
});
