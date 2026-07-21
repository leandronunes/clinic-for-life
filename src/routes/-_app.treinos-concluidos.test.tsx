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
  confirmCheckIn: vi.fn(),
}));
import { fetchCompletedCheckIns, markCheckInViewed, confirmCheckIn } from "@/lib/api/check-ins";
const mockFetchCompleted = vi.mocked(fetchCompletedCheckIns);
const mockMarkViewed = vi.mocked(markCheckInViewed);
const mockConfirmCheckIn = vi.mocked(confirmCheckIn);

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
    student_confirmed_at: "2026-07-10T10:45:00Z",
    personal_confirmed_at: null,
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

    expect(await screen.findByText("Novo")).toBeInTheDocument();
  });

  it("keeps a viewed check-in without feedback under 'Aguardando feedback', without a 'Novo' badge", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ viewed_at: "2026-07-11T09:00:00Z" })]);

    render(<TreinosConcluidosPage />, { wrapper });

    expect(await screen.findByText("Aguardando feedback (1)")).toBeInTheDocument();
    expect(screen.queryByText("Novo")).not.toBeInTheDocument();
  });

  it("moves a check-in with feedback into the collapsed 'Já respondido' section, showing its emoji", async () => {
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
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    // "Já respondido" starts collapsed — the card isn't in the DOM until expanded.
    expect(await screen.findByText("Aguardando feedback (0)")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Júlia Ferreira — Treino A" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Já respondido/i }));
    const card = await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" });
    expect(within(card).getByLabelText("Feedback enviado")).toHaveTextContent("🔥");
  });

  it("marks a not-yet-viewed check-in as viewed when its detail is opened", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn()]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));

    await waitFor(() => {
      expect(mockMarkViewed).toHaveBeenCalledWith("s1", "w1", "ci1");
    });
  });

  it("does not re-mark an already-viewed check-in", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ viewed_at: "2026-07-11T09:00:00Z" })]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    await screen.findByRole("dialog");

    expect(mockMarkViewed).not.toHaveBeenCalled();
  });

  it("shows the PSE badge in the review dialog when recorded", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ pse: 9 })]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/9 · Máximo/)).toBeInTheDocument();
  });

  it("omits the PSE badge in the review dialog when no PSE was recorded", async () => {
    mockFetchCompleted.mockResolvedValue([buildCheckIn({ pse: null })]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).queryByText(/PSE \d+ · (Leve|Moderado|Intenso|Máximo)/),
    ).not.toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText(/Mensagem/i), "Mandou muito bem!");
    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", {
        message: "Mandou muito bem!",
      });
      expect(toast.success).toHaveBeenCalledWith("Feedback enviado");
    });
    // The dialog stays open afterwards so the personal can review the sent
    // message in the history — it only closes on explicit dismissal.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sends an emoji reaction immediately, independent of the message", async () => {
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

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Escolher emoji/i }));
    await user.click(screen.getByRole("button", { name: "💪" }));

    // Picking the emoji submits the reaction right away — no "Enviar feedback" click needed,
    // and the dialog stays open so the personal can still add a message separately.
    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", { emoji: "💪" });
      expect(toast.success).toHaveBeenCalledWith("Reação enviada");
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sends the emoji reaction and the message as two independent feedback entries", async () => {
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

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /Escolher emoji/i }));
    await user.click(screen.getByRole("button", { name: "💪" }));
    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", { emoji: "💪" });
    });

    mockCreateFeedback.mockResolvedValue({
      id: "f2",
      workout_check_in_id: "ci1",
      emoji: null,
      message: "Excelente execução!",
      author_name: "Rafael Monteiro",
      created_at: "2026-07-13T09:00:00Z",
    });
    await user.type(screen.getByLabelText(/Mensagem/i), "Excelente execução!");
    await user.click(screen.getByRole("button", { name: /Enviar feedback/i }));

    await waitFor(() => {
      expect(mockCreateFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", {
        message: "Excelente execução!",
      });
      expect(toast.success).toHaveBeenCalledWith("Feedback enviado");
    });
    expect(mockCreateFeedback).toHaveBeenCalledTimes(2);
  });

  it("shows a badge for a check-in the student performed themselves", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({ student_confirmed_at: "2026-07-10T10:45:00Z", personal_confirmed_at: null }),
    ]);

    render(<TreinosConcluidosPage />, { wrapper });

    expect(await screen.findByText("Feito pelo aluno")).toBeInTheDocument();
  });

  it("does not show the self check-in badge once mutually confirmed", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({
        student_confirmed_at: "2026-07-10T10:45:00Z",
        personal_confirmed_at: "2026-07-10T11:00:00Z",
      }),
    ]);

    render(<TreinosConcluidosPage />, { wrapper });

    await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" });
    expect(screen.queryByText("Feito pelo aluno")).not.toBeInTheDocument();
  });

  it("lets the personal confirm a check-in the student performed themselves", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({ student_confirmed_at: "2026-07-10T10:45:00Z", personal_confirmed_at: null }),
    ]);
    mockConfirmCheckIn.mockResolvedValue(
      buildCheckIn({
        student_confirmed_at: "2026-07-10T10:45:00Z",
        personal_confirmed_at: "2026-07-10T11:00:00Z",
      }),
    );
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/não conta no ciclo de atendimento ainda/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar check-in" }));

    await waitFor(() => {
      expect(mockConfirmCheckIn).toHaveBeenCalledWith("s1", "w1", "ci1");
      expect(toast.success).toHaveBeenCalledWith(
        "Check-in confirmado — agora conta no ciclo de atendimento",
      );
    });
  });

  it("shows an informational message with no button while awaiting the student's confirmation", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({ student_confirmed_at: null, personal_confirmed_at: "2026-07-10T11:00:00Z" }),
    ]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByText(/aguardando confirmação do aluno — ainda não conta no ciclo/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Confirmar check-in" }),
    ).not.toBeInTheDocument();
  });

  it("shows a confirmed message instead of the confirm button once mutually confirmed", async () => {
    mockFetchCompleted.mockResolvedValue([
      buildCheckIn({
        student_confirmed_at: "2026-07-10T10:45:00Z",
        personal_confirmed_at: "2026-07-10T11:00:00Z",
      }),
    ]);
    const user = userEvent.setup();

    render(<TreinosConcluidosPage />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByText(/confirmado pelos dois — conta no ciclo de atendimento/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Confirmar check-in" }),
    ).not.toBeInTheDocument();
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

    // The check-in already has feedback, so it lives in the collapsed
    // "Já respondido" section — expand it before it's reachable.
    await user.click(await screen.findByRole("button", { name: /Já respondido/i }));
    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
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

    // The check-in already has feedback, so it lives in the collapsed
    // "Já respondido" section — expand it before it's reachable.
    await user.click(await screen.findByRole("button", { name: /Já respondido/i }));
    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
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

    // The check-in already has feedback, so it lives in the collapsed
    // "Já respondido" section — expand it before it's reachable.
    await user.click(await screen.findByRole("button", { name: /Já respondido/i }));
    await user.click(await screen.findByRole("button", { name: "Júlia Ferreira — Treino A" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Remover feedback/i }));

    await waitFor(() => {
      expect(mockDeleteFeedback).toHaveBeenCalledWith("s1", "w1", "ci1", "f-existing");
      expect(toast.success).toHaveBeenCalledWith("Feedback removido");
    });
  });

  describe("resumo por aluno", () => {
    const juliaPending = buildCheckIn({
      id: "ci-julia-1",
      student_id: "s1",
      student_name: "Júlia Ferreira",
      workout_title: "Treino A",
    });
    const juliaAnswered = buildCheckIn({
      id: "ci-julia-2",
      student_id: "s1",
      student_name: "Júlia Ferreira",
      workout_title: "Treino B",
      viewed_at: "2026-07-11T09:00:00Z",
      feedbacks: [
        {
          id: "f-julia",
          workout_check_in_id: "ci-julia-2",
          emoji: "🔥",
          message: null,
          author_name: "Rafael Monteiro",
          created_at: "2026-07-11T09:00:00Z",
        },
      ],
    });
    const marcosAnswered = buildCheckIn({
      id: "ci-marcos-1",
      student_id: "s2",
      student_name: "Marcos Lima",
      workout_title: "Treino C",
      viewed_at: "2026-07-11T09:00:00Z",
      feedbacks: [
        {
          id: "f-marcos",
          workout_check_in_id: "ci-marcos-1",
          emoji: "💪",
          message: null,
          author_name: "Rafael Monteiro",
          created_at: "2026-07-11T09:00:00Z",
        },
      ],
    });

    it("shows each student's total completed workouts and pending-feedback count", async () => {
      mockFetchCompleted.mockResolvedValue([juliaPending, juliaAnswered, marcosAnswered]);

      render(<TreinosConcluidosPage />, { wrapper });

      const juliaChip = await screen.findByRole("button", { name: "Filtrar por Júlia Ferreira" });
      expect(within(juliaChip).getByText("2 treinos concluídos")).toBeInTheDocument();
      expect(within(juliaChip).getByText("1 aguardando")).toBeInTheDocument();

      const marcosChip = screen.getByRole("button", { name: "Filtrar por Marcos Lima" });
      expect(within(marcosChip).getByText("1 treino concluído")).toBeInTheDocument();
      expect(within(marcosChip).queryByText(/aguardando/)).not.toBeInTheDocument();
    });

    it("lists students with pending feedback before students with none", async () => {
      mockFetchCompleted.mockResolvedValue([marcosAnswered, juliaPending, juliaAnswered]);

      render(<TreinosConcluidosPage />, { wrapper });

      await screen.findByRole("button", { name: "Filtrar por Júlia Ferreira" });
      const chipNames = screen
        .getAllByRole("button", { name: /^Filtrar por/ })
        .map((el) => el.getAttribute("aria-label"));
      expect(chipNames).toEqual(["Filtrar por Júlia Ferreira", "Filtrar por Marcos Lima"]);
    });

    it("filters the feed to the selected student, and toggles off on a second click", async () => {
      mockFetchCompleted.mockResolvedValue([juliaPending, marcosAnswered]);
      const user = userEvent.setup();

      render(<TreinosConcluidosPage />, { wrapper });

      await user.click(await screen.findByRole("button", { name: /Já respondido/i }));
      await screen.findByRole("button", { name: "Marcos Lima — Treino C" });

      await user.click(screen.getByRole("button", { name: "Filtrar por Júlia Ferreira" }));

      expect(
        screen.queryByRole("button", { name: "Marcos Lima — Treino C" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Júlia Ferreira — Treino A" })).toBeInTheDocument();

      // Toggling the filter back off: the "Já respondido" section had already
      // been expanded and that state lives in the page, not in the
      // conditionally-rendered block, so Marcos's card reappears expanded
      // without a second click.
      await user.click(screen.getByRole("button", { name: "Filtrar por Júlia Ferreira" }));

      expect(
        await screen.findByRole("button", { name: "Marcos Lima — Treino C" }),
      ).toBeInTheDocument();
    });
  });
});
