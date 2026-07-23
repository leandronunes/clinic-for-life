import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StudentMigrationRequestBanner } from "./StudentMigrationRequestBanner";

vi.mock("@/lib/api/students", () => ({
  acceptStudentMigration: vi.fn(),
  rejectStudentMigration: vi.fn(),
}));
import { acceptStudentMigration, rejectStudentMigration } from "@/lib/api/students";
const mockAccept = vi.mocked(acceptStudentMigration);
const mockReject = vi.mocked(rejectStudentMigration);

vi.mock("@/lib/api/auth", () => ({ fetchCurrentUser: vi.fn() }));
import { fetchCurrentUser } from "@/lib/api/auth";
const mockFetchCurrentUser = vi.mocked(fetchCurrentUser);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

const request = {
  id: "r1",
  status: "pending" as const,
  target_organization_name: "Academia Vida Ativa",
  requested_by_name: "Dra. Camila Andrade",
  created_at: "2026-07-23T00:00:00Z",
};

const mockUpdateUser = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("StudentMigrationRequestBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCurrentUser.mockResolvedValue({
      id: "u1",
      name: "Júlia",
      email: "j@test.com",
      role: "student",
    });
  });

  it("renders nothing when there is no pending request", () => {
    mockUseAuth.mockReturnValue({
      user: { pending_migration_request: null },
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);

    const { container } = render(<StudentMigrationRequestBanner />, { wrapper });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the inviter and target organization when a request is pending", () => {
    mockUseAuth.mockReturnValue({
      user: { pending_migration_request: request },
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);

    render(<StudentMigrationRequestBanner />, { wrapper });

    expect(screen.getByText("Dra. Camila Andrade", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Academia Vida Ativa", { exact: false })).toBeInTheDocument();
  });

  it("accepts the request and refreshes the session", async () => {
    mockUseAuth.mockReturnValue({
      user: { pending_migration_request: request },
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);
    mockAccept.mockResolvedValue({ ...request, status: "accepted" });

    render(<StudentMigrationRequestBanner />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }));

    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("rejects the request and refreshes the session", async () => {
    mockUseAuth.mockReturnValue({
      user: { pending_migration_request: request },
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);
    mockReject.mockResolvedValue({ ...request, status: "rejected" });

    render(<StudentMigrationRequestBanner />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Recusar" }));

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows an error toast when accepting fails", async () => {
    mockUseAuth.mockReturnValue({
      user: { pending_migration_request: request },
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);
    mockAccept.mockRejectedValue({ status: 422, message: "Falhou" });

    render(<StudentMigrationRequestBanner />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Aceitar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
