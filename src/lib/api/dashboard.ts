import { http } from "./http";

export type RangeFilter = "day" | "week" | "month" | "year";

export interface DashboardKpi {
  label: string;
  value: number;
  delta: number;
  icon: "users" | "trainer" | "handshake" | "clipboard" | "dumbbell";
}

export interface ActivityPoint {
  label: string;
  treinos: number;
  avaliacoes: number;
}

interface BackendActivityPoint {
  label: string;
  workouts: number;
  assessments: number;
}

const RANGE_DAYS: Record<RangeFilter, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export function fetchKpis(range: RangeFilter = "month"): Promise<DashboardKpi[]> {
  return http.get<DashboardKpi[]>("/api/v1/dashboard/kpis", { params: { range } });
}

export async function fetchActivity(range: RangeFilter = "month"): Promise<ActivityPoint[]> {
  const days = RANGE_DAYS[range];
  const raw = await http.get<BackendActivityPoint[]>("/api/v1/dashboard/activity", {
    params: { days },
  });
  return raw.map((p) => ({
    label: p.label,
    treinos: p.workouts,
    avaliacoes: p.assessments,
  }));
}
