import { http } from "./http";

export type TrainerStatus = "active" | "blocked" | "inactive";

export interface Trainer {
  id: string;
  name: string;
  cpf: string;
  cref: string;
  email: string;
  phone: string;
  status: TrainerStatus;
  avatar_url?: string | null;
  students_count: number;
}

export interface CreateTrainerPayload {
  name: string;
  cpf?: string;
  cref?: string;
  email: string;
  phone: string;
  status?: TrainerStatus;
}

export type UpdateTrainerPayload = Partial<CreateTrainerPayload>;

/**
 * @param status Filters by trainer status, resolved server-side. Pass a
 * single status or an array (sent as a comma-separated list, e.g.
 * "active,blocked"). Omit to get trainers of any status.
 */
export function fetchTrainers(
  query?: string,
  status?: TrainerStatus | TrainerStatus[],
): Promise<Trainer[]> {
  const statusValue = Array.isArray(status) ? status.join(",") : status;
  const params: Record<string, string> = {};
  if (statusValue) params.status = statusValue;

  if (query && query.trim()) {
    return http.get<Trainer[]>("/api/v1/trainers/search", { params: { query, ...params } });
  }
  if (Object.keys(params).length > 0) {
    return http.get<Trainer[]>("/api/v1/trainers", { params });
  }
  return http.get<Trainer[]>("/api/v1/trainers");
}

export function fetchTrainer(id: string): Promise<Trainer> {
  return http.get<Trainer>(`/api/v1/trainers/${id}`);
}

export function createTrainer(payload: CreateTrainerPayload): Promise<Trainer> {
  return http.post<Trainer>("/api/v1/trainers", payload);
}

export function updateTrainer(id: string, payload: UpdateTrainerPayload): Promise<Trainer> {
  return http.patch<Trainer>(`/api/v1/trainers/${id}`, payload);
}

/** Permanently deletes the trainer account. */
export function deleteTrainer(id: string): Promise<void> {
  return http.del<void>(`/api/v1/trainers/${id}`);
}
