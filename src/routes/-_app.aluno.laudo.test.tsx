import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth";
import type { Student } from "@/lib/api/students";
import type { BioimpedanceMeasurement } from "@/lib/api/bioimpedance";
import type { BiomechanicalAssessment } from "@/lib/api/biomechanics";
import type { StructuralAssessment } from "@/lib/api/structural-assessment";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (opts: Record<string, unknown>) => opts,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

vi.mock("@/contexts/use-auth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/contexts/use-auth";
const mockUseAuth = vi.mocked(useAuth);

vi.mock("@/lib/api/students", () => ({ fetchStudent: vi.fn() }));
import { fetchStudent } from "@/lib/api/students";
const mockFetchStudent = vi.mocked(fetchStudent);

vi.mock("@/lib/api/bioimpedance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/bioimpedance")>();
  return { ...actual, fetchMeasurements: vi.fn() };
});
import { fetchMeasurements } from "@/lib/api/bioimpedance";
const mockFetchMeasurements = vi.mocked(fetchMeasurements);

vi.mock("@/lib/api/biomechanics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/biomechanics")>();
  return {
    ...actual,
    fetchBiomechanicsAssessments: vi.fn(),
    fetchCurrentBiomechanicsAssessment: vi.fn(),
  };
});
import {
  fetchBiomechanicsAssessments,
  fetchCurrentBiomechanicsAssessment,
} from "@/lib/api/biomechanics";
const mockFetchHistory = vi.mocked(fetchBiomechanicsAssessments);
const mockFetchCurrent = vi.mocked(fetchCurrentBiomechanicsAssessment);

vi.mock("@/lib/api/structural-assessment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/structural-assessment")>();
  return { ...actual, fetchStructuralAssessment: vi.fn(), updateStructuralAssessment: vi.fn() };
});
import { fetchStructuralAssessment } from "@/lib/api/structural-assessment";
const mockFetchStructural = vi.mocked(fetchStructuralAssessment);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LaudoPage } from "./_app.aluno.laudo";

const alunoUser: AuthUser = {
  id: "u1",
  name: "Personal",
  email: "personal@test.com",
  role: "personal",
};

const student: Student = {
  id: "s1",
  name: "Júlia Ferreira",
  birth_date: "1996-05-12",
  sex: "female",
  email: "julia@test.com",
  phone: "(11) 97777-0000",
  trainer_id: "t1",
  trainer_name: "Rafael Monteiro",
  status: "active",
  partner_card_enabled: true,
  created_at: "2025-01-01T00:00:00Z",
};

const structural: StructuralAssessment = {
  scoliosis: true,
  hyperkyphosis: false,
  hyperlordosis: false,
  spine_rotation: false,
  hip_rotation: false,
  scapular_girdle_imbalance: false,
  scapular_dyskinesis: false,
  shortening: false,
  limb_length_difference: false,
  pelvic_anteversion: false,
  pelvic_retroversion: false,
  knee_valgus: false,
  knee_varus: false,
  cavus_foot_arch: false,
  flat_foot_arch: false,
};

const currentAssessment: BiomechanicalAssessment = {
  id: "b1",
  created_at: "2026-01-10T10:00:00Z",
  images: { frontal: "https://x/frontal.jpg", posterior: "https://x/posterior.jpg" },
};

const history: BiomechanicalAssessment[] = [
  currentAssessment,
  { id: "b0", created_at: "2025-10-01T10:00:00Z", images: { frontal: "https://x/old.jpg" } },
];

const measurements: BioimpedanceMeasurement[] = [
  {
    id: "m1",
    student_id: "s1",
    measured_on: "2025-10-01",
    weight_kg: 80,
    muscle_mass_kg: 35,
    fat_percentage: 22,
    visceral_fat: 8,
    bmi: 26,
    source: "manual",
    photo_url: "https://x/before.jpg",
  },
  {
    id: "m2",
    student_id: "s1",
    measured_on: "2026-01-10",
    weight_kg: 76,
    muscle_mass_kg: 37,
    fat_percentage: 18,
    visceral_fat: 6,
    bmi: 24,
    source: "manual",
    photo_url: "https://x/after.jpg",
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("LaudoPage", () => {
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
    mockFetchStudent.mockResolvedValue(student);
    mockFetchMeasurements.mockResolvedValue(measurements);
    mockFetchCurrent.mockResolvedValue(currentAssessment);
    mockFetchHistory.mockResolvedValue(history);
    mockFetchStructural.mockResolvedValue(structural);
  });

  it("redirects to /aluno when not impersonating (real student session)", () => {
    mockUseAuth.mockReturnValue({
      user: alunoUser,
      effectiveAlunoId: "s1",
      isImpersonating: false,
    } as ReturnType<typeof useAuth>);

    render(<LaudoPage />, { wrapper });

    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/aluno");
  });

  it("renders every section with data when impersonating", async () => {
    mockUseAuth.mockReturnValue({
      user: alunoUser,
      effectiveAlunoId: "s1",
      isImpersonating: true,
    } as ReturnType<typeof useAuth>);

    render(<LaudoPage />, { wrapper });

    await waitFor(() => expect(screen.getByText(/Júlia Ferreira/)).toBeInTheDocument());
    expect(screen.getByText("Escoliose")).toBeInTheDocument();
    expect(screen.getByText("Registro Fotográfico Atual")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Histórico de Medições")).toBeInTheDocument());
    expect(screen.getAllByText(/76/).length).toBeGreaterThan(0);
    expect(screen.getByText("Antes")).toBeInTheDocument();
    expect(screen.getByText("Depois")).toBeInTheDocument();
  });

  it("shows each section's empty state when its data source is empty", async () => {
    mockUseAuth.mockReturnValue({
      user: alunoUser,
      effectiveAlunoId: "s1",
      isImpersonating: true,
    } as ReturnType<typeof useAuth>);
    mockFetchMeasurements.mockResolvedValue([]);
    mockFetchCurrent.mockResolvedValue({
      id: "b1",
      created_at: "2026-01-10T10:00:00Z",
      images: {},
    });
    mockFetchHistory.mockResolvedValue([]);

    render(<LaudoPage />, { wrapper });

    await waitFor(() => expect(screen.getByText("Nenhuma foto registrada.")).toBeInTheDocument());
    expect(screen.getByText("Nenhuma avaliação registrada.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum dado de bioimpedância registrado.")).toBeInTheDocument();
    expect(screen.getByText(/Fotos insuficientes para comparação/)).toBeInTheDocument();
  });

  it("calls window.print() when the Imprimir button is clicked", async () => {
    mockUseAuth.mockReturnValue({
      user: alunoUser,
      effectiveAlunoId: "s1",
      isImpersonating: true,
    } as ReturnType<typeof useAuth>);
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();

    render(<LaudoPage />, { wrapper });
    await user.click(screen.getByRole("button", { name: /imprimir/i }));

    expect(printSpy).toHaveBeenCalled();
  });
});
