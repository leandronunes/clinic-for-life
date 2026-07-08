import { http } from "./http";

export type PartnerCategory =
  | "Nutrition"
  | "Physiotherapy"
  | "Sports Medicine"
  | "Supplementation"
  | "Aesthetics"
  | "Laboratories";

export interface Partner {
  id: string;
  name: string;
  logo_url?: string | null;
  category: PartnerCategory;
  description?: string | null;
  discount_details?: string | null;
  coupon?: string | null;
  link?: string | null;
  created_at: string;
}

export interface CreatePartnerPayload {
  name: string;
  category: PartnerCategory;
  logo_url?: string;
  description?: string;
  discount_details?: string;
  coupon?: string;
  link?: string;
}

export type UpdatePartnerPayload = Partial<CreatePartnerPayload>;

/** Maps PT display label to EN backend category value. */
export const CATEGORY_TO_BACKEND: Record<string, PartnerCategory> = {
  Nutrição: "Nutrition",
  Fisioterapia: "Physiotherapy",
  "Medicina Esportiva": "Sports Medicine",
  Suplementação: "Supplementation",
  Estética: "Aesthetics",
  Laboratórios: "Laboratories",
};

/** Maps EN backend category to PT display label. */
export const CATEGORY_FROM_BACKEND: Record<PartnerCategory, string> = {
  Nutrition: "Nutrição",
  Physiotherapy: "Fisioterapia",
  "Sports Medicine": "Medicina Esportiva",
  Supplementation: "Suplementação",
  Aesthetics: "Estética",
  Laboratories: "Laboratórios",
};

export function fetchPartners(): Promise<Partner[]> {
  return http.get<Partner[]>("/api/v1/partners");
}

export function createPartner(payload: CreatePartnerPayload): Promise<Partner> {
  return http.post<Partner>("/api/v1/partners", payload);
}

export function updatePartner(id: string, payload: UpdatePartnerPayload): Promise<Partner> {
  return http.patch<Partner>(`/api/v1/partners/${id}`, payload);
}

export function deletePartner(id: string): Promise<null> {
  return http.del<null>(`/api/v1/partners/${id}`, { allowEmpty: true });
}
