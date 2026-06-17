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
  cpf: string;
  cref: string;
  email: string;
  phone: string;
  status?: TrainerStatus;
}

export type UpdateTrainerPayload = Partial<CreateTrainerPayload>;

export function fetchTrainers(query?: string): Promise<Trainer[]> {
  if (query && query.trim()) {
    return http.get<Trainer[]>("/api/v1/trainers/search", { params: { query } });
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
