import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock TanStack Router before importing the route — use importOriginal so
// internal helpers (lazyRouteComponent, etc.) remain available
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
    useNavigate: () => vi.fn(),
  };
});

// Mock Radix AlertDialog so it renders inline in jsdom (no portal issues)
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (o: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button data-testid="alert-cancel" {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button data-testid="alert-confirm" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock Radix Tabs so tab switching works in jsdom
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-default-tab={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value: string;
    onClick?: () => void;
  }) => (
    <button role="tab" data-value={value} onClick={onClick}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-tab-content={value}>{children}</div>
  ),
}));

vi.mock("@/lib/api/students", () => ({
  fetchStudents: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  toBackendSex: vi.fn((s: string) => s),
  fromBackendSex: vi.fn((s: string) => s),
}));

vi.mock("@/lib/api/trainers", () => ({
  fetchTrainers: vi.fn(),
  createTrainer: vi.fn(),
  updateTrainer: vi.fn(),
  deleteTrainer: vi.fn(),
  approveTrainer: vi.fn(),
  rejectTrainer: vi.fn(),
}));

vi.mock("@/contexts/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route } from "./_app.usuarios";
import { fetchStudents, deleteStudent, updateStudent } from "@/lib/api/students";
import { fetchTrainers, deleteTrainer, approveTrainer, rejectTrainer } from "@/lib/api/trainers";
import { useAuth } from "@/contexts/use-auth";
import { toast } from "sonner";

const mockFetchStudents = vi.mocked(fetchStudents);
const mockDeleteStudent = vi.mocked(deleteStudent);
const mockUpdateStudent = vi.mocked(updateStudent);
const mockFetchTrainers = vi.mocked(fetchTrainers);
const mockDeleteTrainer = vi.mocked(deleteTrainer);
const mockApproveTrainer = vi.mocked(approveTrainer);
const mockRejectTrainer = vi.mocked(rejectTrainer);
const mockUseAuth = vi.mocked(useAuth);

const student = {
  id: "s1",
  name: "Júlia Ferreira",
  email: "julia@test.com",
  birth_date: "1996-05-12",
  sex: "female" as const,
  phone: "(11) 97777-0000",
  trainer_id: "t1",
  trainer_name: "Rafael",
  status: "active" as const,
  partner_card_enabled: true,
  created_at: "2025-01-01T00:00:00Z",
};

const trainer = {
  id: "t1",
  name: "Rafael Monteiro",
  cpf: "123.456.789-00",
  cref: "012345-G/SP",
  email: "rafael@forlife.app",
  phone: "(11) 98888-0000",
  status: "active" as const,
  students_count: 3,
  approved_at: "2026-01-01T00:00:00Z",
};

const pendingTrainer = {
  id: "t2",
  name: "Bruna Nova",
  cpf: "",
  cref: "",
  email: "bruna@forlife.app",
  phone: "(11) 97777-0000",
  status: "active" as const,
  students_count: 0,
  approved_at: null,
};

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const UsuariosPage = (Route as unknown as { component: React.ComponentType }).component;

async function renderPage() {
  await act(async () => {
    render(
      <QueryClientProvider client={makeQc()}>
        <UsuariosPage />
      </QueryClientProvider>,
    );
    // Flush React Query's promise resolution microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("UsuariosPage — AlunosTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStudents.mockResolvedValue([student]);
    mockFetchTrainers.mockResolvedValue([trainer]);
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" } as ReturnType<
        typeof useAuth
      >["user"],
      canWrite: true,
      hasRole: (r: string) => r === "admin",
      impersonateAluno: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("opens the confirmation dialog when trash is clicked", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    const trashButtons = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("destructive") || b.closest("td"));
    const trashBtn = trashButtons.find((b) => b.getAttribute("class")?.includes("destructive"));
    if (trashBtn) fireEvent.click(trashBtn);

    await waitFor(() => expect(screen.queryByTestId("alert-dialog")).toBeInTheDocument());
  });

  it("calls deleteStudent and shows toast on confirmation", async () => {
    mockDeleteStudent.mockResolvedValue(undefined);
    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    const trashBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("class")?.includes("destructive"));
    if (trashBtn) fireEvent.click(trashBtn);

    await waitFor(() => expect(screen.queryByTestId("alert-confirm")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("alert-confirm"));

    await waitFor(() => expect(mockDeleteStudent).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows error toast when deletion fails", async () => {
    mockDeleteStudent.mockRejectedValue(new Error("Server error"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    const trashBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("class")?.includes("destructive"));
    if (trashBtn) fireEvent.click(trashBtn);

    await waitFor(() => expect(screen.queryByTestId("alert-confirm")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("alert-confirm"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("hides the trash button for personal users", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u2", email: "personal@test.com", role: "personal" } as ReturnType<
        typeof useAuth
      >["user"],
      canWrite: true,
      hasRole: (r: string) => r === "personal",
      impersonateAluno: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    const destructiveBtns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("class")?.includes("destructive"));
    expect(destructiveBtns).toHaveLength(0);
  });

  it("shows the personal's name inline under the student name for admin (mobile fallback)", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    expect(screen.getByText(`Personal: ${student.trainer_name}`)).toBeInTheDocument();
  });

  it("hides the inline personal name for a personal user (they already know it's them)", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u2", email: "personal@test.com", role: "personal" } as ReturnType<
        typeof useAuth
      >["user"],
      canWrite: true,
      hasRole: (r: string) => r === "personal",
      impersonateAluno: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    expect(screen.queryByText(`Personal: ${student.trainer_name}`)).not.toBeInTheDocument();
  });

  describe("Editar aluno — cartão de parceiros", () => {
    async function openEditDialog() {
      await renderPage();
      await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());
      const editBtn = screen
        .getAllByRole("button")
        .find((b) => !b.getAttribute("class")?.includes("destructive") && b.closest("td"));
      if (editBtn) fireEvent.click(editBtn);
      return screen.findByRole("dialog");
    }

    it("shows the partner card toggle for an admin", async () => {
      const dialog = await openEditDialog();
      expect(within(dialog).getByLabelText("Cartão de parceiros")).toBeInTheDocument();
    });

    it("hides the partner card toggle for a personal", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "u2", email: "personal@test.com", role: "personal" } as ReturnType<
          typeof useAuth
        >["user"],
        canWrite: true,
        hasRole: (r: string) => r === "personal",
        impersonateAluno: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);

      const dialog = await openEditDialog();
      expect(within(dialog).queryByLabelText("Cartão de parceiros")).not.toBeInTheDocument();
    });

    it("includes partner_card_enabled in the update when an admin toggles it off", async () => {
      mockUpdateStudent.mockResolvedValue(student);
      const dialog = await openEditDialog();

      await fireEvent.click(within(dialog).getByLabelText("Cartão de parceiros"));
      await fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mockUpdateStudent).toHaveBeenCalledWith(
          "s1",
          expect.objectContaining({ partner_card_enabled: false }),
        ),
      );
    });

    it("does not send partner_card_enabled when a personal saves the form", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: "u2", email: "personal@test.com", role: "personal" } as ReturnType<
          typeof useAuth
        >["user"],
        canWrite: true,
        hasRole: (r: string) => r === "personal",
        impersonateAluno: vi.fn(),
      } as unknown as ReturnType<typeof useAuth>);
      mockUpdateStudent.mockResolvedValue(student);

      const dialog = await openEditDialog();
      await fireEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(mockUpdateStudent).toHaveBeenCalled());
      const payload = mockUpdateStudent.mock.calls[0][1];
      expect(payload).not.toHaveProperty("partner_card_enabled");
    });
  });

  describe("campo Treinos contratados por ciclo (feature flag)", () => {
    beforeEach(() => {
      // Don't rely on the ambient .env — pin a known "off" baseline so these
      // tests pass regardless of what's set on the machine running them.
      vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "false");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    async function openEditDialog() {
      await renderPage();
      await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());
      const editBtn = screen
        .getAllByRole("button")
        .find((b) => !b.getAttribute("class")?.includes("destructive") && b.closest("td"));
      if (editBtn) fireEvent.click(editBtn);
      return screen.findByRole("dialog");
    }

    async function openCreateDialog() {
      await renderPage();
      await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: /novo aluno/i }));
      return screen.findByRole("dialog");
    }

    it("hides the field in Editar aluno when the attendanceCycles flag is off", async () => {
      const dialog = await openEditDialog();
      expect(within(dialog).queryByText("Treinos contratados por ciclo")).not.toBeInTheDocument();
    });

    it("shows the field in Editar aluno when the attendanceCycles flag is on", async () => {
      vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "true");
      const dialog = await openEditDialog();
      expect(within(dialog).getByText("Treinos contratados por ciclo")).toBeInTheDocument();
    });

    it("hides the field in Cadastrar aluno when the attendanceCycles flag is off", async () => {
      const dialog = await openCreateDialog();
      expect(within(dialog).queryByText("Treinos contratados por ciclo")).not.toBeInTheDocument();
    });

    it("shows the field in Cadastrar aluno when the attendanceCycles flag is on", async () => {
      vi.stubEnv("VITE_FEATURE_ATTENDANCE_CYCLES", "true");
      const dialog = await openCreateDialog();
      expect(within(dialog).getByText("Treinos contratados por ciclo")).toBeInTheDocument();
    });
  });
});

describe("UsuariosPage — PersonaisTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStudents.mockResolvedValue([]);
    mockFetchTrainers.mockResolvedValue([trainer]);
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "admin@test.com", role: "admin" } as ReturnType<
        typeof useAuth
      >["user"],
      canWrite: true,
      hasRole: (r: string) => r === "admin",
      impersonateAluno: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("calls deleteTrainer and shows toast on confirmation", async () => {
    mockDeleteTrainer.mockResolvedValue(undefined);
    await renderPage();

    // PersonaisTab is rendered alongside AlunosTab (Tabs mock renders all content)
    await waitFor(() => expect(screen.getByText("Rafael Monteiro")).toBeInTheDocument());

    const trashBtns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("class")?.includes("destructive"));
    expect(trashBtns.length).toBeGreaterThan(0);
    fireEvent.click(trashBtns[trashBtns.length - 1]);

    await waitFor(() => expect(screen.queryByTestId("alert-confirm")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTestId("alert-confirm")[0]);

    await waitFor(() => expect(mockDeleteTrainer).toHaveBeenCalledWith("t1"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows students_count warning in confirmation dialog when trainer has students", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Rafael Monteiro")).toBeInTheDocument());

    const trashBtns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("class")?.includes("destructive"));
    fireEvent.click(trashBtns[trashBtns.length - 1]);

    await waitFor(() => expect(screen.queryByText(/3 aluno\(s\)/)).toBeInTheDocument());
  });

  it("shows the student count inline under the personal's name (mobile fallback)", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Rafael Monteiro")).toBeInTheDocument());

    expect(screen.getByText(`${trainer.students_count} alunos`)).toBeInTheDocument();
  });

  describe("pedidos de entrada pendentes de aprovação", () => {
    beforeEach(() => {
      mockFetchTrainers.mockResolvedValue([trainer, pendingTrainer]);
    });

    it("shows a pending-count badge and a 'Pendente' badge on the pending row", async () => {
      await renderPage();
      await waitFor(() => expect(screen.getByText("Bruna Nova")).toBeInTheDocument());

      expect(screen.getByText("1 pendente de aprovação")).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
    });

    it("shows Aprovar/Rejeitar instead of edit/delete for a pending trainer", async () => {
      await renderPage();
      await waitFor(() => expect(screen.getByText("Bruna Nova")).toBeInTheDocument());

      expect(screen.getByLabelText("Aprovar Bruna Nova")).toBeInTheDocument();
      expect(screen.getByLabelText("Rejeitar Bruna Nova")).toBeInTheDocument();
    });

    it("approves a pending trainer and shows a toast", async () => {
      mockApproveTrainer.mockResolvedValue({
        ...pendingTrainer,
        approved_at: "2026-01-02T00:00:00Z",
      });
      await renderPage();
      await waitFor(() => expect(screen.getByText("Bruna Nova")).toBeInTheDocument());

      fireEvent.click(screen.getByLabelText("Aprovar Bruna Nova"));

      await waitFor(() => expect(mockApproveTrainer).toHaveBeenCalledWith("t2"));
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
    });

    it("rejects a pending trainer after confirmation and shows a toast", async () => {
      mockRejectTrainer.mockResolvedValue(undefined);
      await renderPage();
      await waitFor(() => expect(screen.getByText("Bruna Nova")).toBeInTheDocument());

      fireEvent.click(screen.getByLabelText("Rejeitar Bruna Nova"));
      await waitFor(() => expect(screen.queryByTestId("alert-confirm")).toBeInTheDocument());
      fireEvent.click(screen.getByTestId("alert-confirm"));

      await waitFor(() => expect(mockRejectTrainer).toHaveBeenCalledWith("t2"));
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
    });

    it("does not show a pending badge when there are no pending trainers", async () => {
      mockFetchTrainers.mockResolvedValue([trainer]);
      await renderPage();
      await waitFor(() => expect(screen.getByText("Rafael Monteiro")).toBeInTheDocument());

      expect(screen.queryByText(/pendente/)).not.toBeInTheDocument();
    });
  });
});
