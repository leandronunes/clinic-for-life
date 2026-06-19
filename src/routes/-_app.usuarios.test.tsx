import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route } from "./_app.usuarios";
import { fetchStudents, deleteStudent } from "@/lib/api/students";
import { fetchTrainers, deleteTrainer } from "@/lib/api/trainers";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const mockFetchStudents = vi.mocked(fetchStudents);
const mockDeleteStudent = vi.mocked(deleteStudent);
const mockFetchTrainers = vi.mocked(fetchTrainers);
const mockDeleteTrainer = vi.mocked(deleteTrainer);
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
    } as ReturnType<typeof useAuth>);
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
    } as ReturnType<typeof useAuth>);

    await renderPage();
    await waitFor(() => expect(screen.getByText("Júlia Ferreira")).toBeInTheDocument());

    const destructiveBtns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("class")?.includes("destructive"));
    expect(destructiveBtns).toHaveLength(0);
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
    } as ReturnType<typeof useAuth>);
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
});
