import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { BackendUser } from "@/lib/api/auth";
import type { Student } from "@/lib/api/students";
import { PerfilPage } from "./_app.perfil";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/students", () => ({
  fetchStudent: vi.fn(),
  updateStudent: vi.fn(),
}));
import { fetchStudent, updateStudent } from "@/lib/api/students";
const mockFetchStudent = vi.mocked(fetchStudent);
const mockUpdateStudent = vi.mocked(updateStudent);

vi.mock("@/lib/api/trainers", () => ({ fetchTrainers: vi.fn() }));
import { fetchTrainers } from "@/lib/api/trainers";
const mockFetchTrainers = vi.mocked(fetchTrainers);

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return {
    ...actual,
    fetchCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
  };
});
import { fetchCurrentUser, updateCurrentUser } from "@/lib/api/auth";
const mockFetchCurrentUser = vi.mocked(fetchCurrentUser);
const mockUpdateCurrentUser = vi.mocked(updateCurrentUser);

vi.mock("@/components/NotificationsCard", () => ({
  NotificationsCard: () => <div data-testid="notifications-card" />,
}));

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
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const student: Student = {
  id: "s1",
  name: "Júlia Ferreira",
  birth_date: "1996-04-12",
  sex: "female",
  email: "julia@test.com",
  phone: "11999990000",
  trainer_id: "t1",
  trainer_name: "Carlos Personal",
  status: "active",
  partner_card_enabled: true,
  health_plan: "Unimed",
  emergency_contact: "Maria - 11988887777",
  created_at: "2025-01-01T00:00:00Z",
};

const backendAdmin: BackendUser = {
  id: "u1",
  name: "Ana Admin",
  email: "ana@test.com",
  role: "admin",
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: null,
    token: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
    hasRole: vi.fn(() => false),
    canWrite: false,
    impersonatedAlunoId: null,
    effectiveAlunoId: null,
    effectiveRole: null,
    isImpersonating: false,
    impersonateAluno: vi.fn(),
    stopImpersonating: vi.fn(),
    ...overrides,
  };
}

describe("PerfilPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchTrainers.mockResolvedValue([]);
  });

  it("aluno real vê o formulário editável e pode salvar (comportamento existente)", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: (...roles) => roles.includes("aluno"),
        isImpersonating: false,
        effectiveAlunoId: "s1",
      }),
    );
    mockFetchStudent.mockResolvedValue(student);
    mockUpdateStudent.mockResolvedValue(student);

    render(<PerfilPage />, { wrapper });

    const nameInput = await screen.findByDisplayValue("Júlia Ferreira");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Júlia Souza");

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(mockUpdateStudent).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ name: "Júlia Souza" }),
      ),
    );
    expect(screen.getByTestId("notifications-card")).toBeInTheDocument();
  });

  it("admin/personal impersonando um aluno vê o perfil somente leitura", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: () => false,
        isImpersonating: true,
        effectiveAlunoId: "s1",
      }),
    );
    mockFetchStudent.mockResolvedValue(student);

    render(<PerfilPage />, { wrapper });

    await screen.findByText("Júlia Ferreira");
    expect(screen.getByText(/somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salvar/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("notifications-card")).not.toBeInTheDocument();
    expect(screen.getByText("Carlos Personal")).toBeInTheDocument();
  });

  it("admin/personal na própria conta (sem impersonar) edita nome/e-mail via updateCurrentUser", async () => {
    const updateUserMock = vi.fn();
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: (...roles) => roles.includes("admin"),
        isImpersonating: false,
        effectiveAlunoId: null,
        updateUser: updateUserMock,
      }),
    );
    mockFetchCurrentUser.mockResolvedValue(backendAdmin);
    mockUpdateCurrentUser.mockResolvedValue({ ...backendAdmin, name: "Ana Souza" });

    render(<PerfilPage />, { wrapper });

    const nameInput = await screen.findByDisplayValue("Ana Admin");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Ana Souza");

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
        name: "Ana Souza",
        email: "ana@test.com",
        cpf: "",
      }),
    );
    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({ ...backendAdmin, name: "Ana Souza" }),
    );
    expect(screen.queryByTestId("notifications-card")).not.toBeInTheDocument();
  });

  it("admin/personal na própria conta edita o CPF via updateCurrentUser", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: (...roles) => roles.includes("admin"),
        isImpersonating: false,
        effectiveAlunoId: null,
      }),
    );
    mockFetchCurrentUser.mockResolvedValue(backendAdmin);
    mockUpdateCurrentUser.mockResolvedValue({ ...backendAdmin, cpf: "11122233344" });

    render(<PerfilPage />, { wrapper });

    await screen.findByDisplayValue("Ana Admin");
    const textboxes = screen.getAllByRole("textbox");
    const cpfInput = textboxes[textboxes.length - 1];
    await userEvent.type(cpfInput, "11122233344");

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({
        name: "Ana Admin",
        email: "ana@test.com",
        cpf: "11122233344",
      }),
    );
  });

  it("lista de personais no 'Meu Personal' pede apenas personais ativos ao backend", async () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: (...roles) => roles.includes("aluno"),
        isImpersonating: false,
        effectiveAlunoId: "s1",
      }),
    );
    mockFetchStudent.mockResolvedValue(student);
    // O backend já filtra por status — o mock aqui só devolve o que o
    // endpoint filtrado retornaria (nenhum personal inativo).
    mockFetchTrainers.mockResolvedValue([
      {
        id: "t1",
        name: "Carlos Personal",
        cpf: "111.111.111-11",
        cref: "111111-G/SP",
        email: "carlos@test.com",
        phone: "11999990000",
        status: "active",
        students_count: 3,
      },
    ]);

    render(<PerfilPage />, { wrapper });

    await screen.findByText("Meu Personal");
    await waitFor(() => expect(screen.getByText("Carlos Personal")).toBeInTheDocument());
    expect(mockFetchTrainers).toHaveBeenCalledWith("", "active");
  });

  it("redireciona para /dashboard quando não há papel reconhecido", () => {
    mockUseAuth.mockReturnValue(
      buildAuth({
        hasRole: () => false,
        isImpersonating: false,
        effectiveAlunoId: null,
      }),
    );

    render(<PerfilPage />, { wrapper });

    expect(screen.getByTestId("navigate")).toHaveTextContent("/dashboard");
  });
});
