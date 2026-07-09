import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePartnerCardEnabled } from "./use-partner-card-enabled";
import type { Student } from "@/lib/api/students";

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/students", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/students")>();
  return { ...actual, fetchStudent: vi.fn() };
});
import { fetchStudent } from "@/lib/api/students";
const mockFetchStudent = vi.mocked(fetchStudent);

const student: Student = {
  id: "s1",
  name: "Júlia Ferreira",
  birth_date: "1996-05-12",
  sex: "female",
  email: "julia@test.com",
  phone: "(11) 97777-0000",
  trainer_id: "t1",
  trainer_name: "Rafael",
  status: "active",
  partner_card_enabled: false,
  created_at: "2025-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("usePartnerCardEnabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to true while the student query is loading", () => {
    mockUseAuth.mockReturnValue({
      effectiveAlunoId: "s1",
      effectiveRole: "aluno",
    } as ReturnType<typeof useAuth>);
    mockFetchStudent.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePartnerCardEnabled(), { wrapper });

    expect(result.current).toBe(true);
  });

  it("returns the fetched student's partner_card_enabled value", async () => {
    mockUseAuth.mockReturnValue({
      effectiveAlunoId: "s1",
      effectiveRole: "aluno",
    } as ReturnType<typeof useAuth>);
    mockFetchStudent.mockResolvedValue(student);

    const { result } = renderHook(() => usePartnerCardEnabled(), { wrapper });

    await waitFor(() => expect(result.current).toBe(false));
  });

  it("defaults to true and skips fetching for a non-aluno role", () => {
    mockUseAuth.mockReturnValue({
      effectiveAlunoId: null,
      effectiveRole: "admin",
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => usePartnerCardEnabled(), { wrapper });

    expect(result.current).toBe(true);
    expect(mockFetchStudent).not.toHaveBeenCalled();
  });
});
