import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DashboardPage } from "./_app.dashboard";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, createFileRoute: () => (opts: Record<string, unknown>) => opts };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/dashboard", () => ({
  fetchKpis: vi.fn(),
  fetchActivity: vi.fn(),
  fetchAttendanceSummary: vi.fn(),
}));
import { fetchKpis, fetchActivity, fetchAttendanceSummary } from "@/lib/api/dashboard";
const mockFetchKpis = vi.mocked(fetchKpis);
const mockFetchActivity = vi.mocked(fetchActivity);
const mockFetchAttendance = vi.mocked(fetchAttendanceSummary);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DashboardPage", () => {
  // jsdom doesn't implement ResizeObserver; recharts' ResponsiveContainer
  // needs it to mount without throwing during the passive-effects phase.
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "u1", name: "Ana Admin", email: "ana@test.com", role: "admin" },
      token: "tok",
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      hasRole: (...roles) => roles.includes("admin"),
      canWrite: true,
      impersonatedAlunoId: null,
      effectiveAlunoId: null,
      effectiveRole: null,
      isImpersonating: false,
      impersonateAluno: vi.fn(),
      stopImpersonating: vi.fn(),
    });
    mockFetchKpis.mockResolvedValue([]);
    mockFetchActivity.mockResolvedValue([]);
    mockFetchAttendance.mockResolvedValue({
      total_check_ins: 12,
      completed_check_ins: 9,
      students_with_check_in: 4,
      active_students: 10,
    });
  });

  it("shows a loading placeholder for the attendance card while pending", async () => {
    mockFetchAttendance.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />, { wrapper });

    await screen.findByText("Assiduidade");
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("shows the attendance stats once loaded", async () => {
    render(<DashboardPage />, { wrapper });

    await screen.findByText("12");
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(mockFetchAttendance).toHaveBeenCalledWith("month");
  });
});
