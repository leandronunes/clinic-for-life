import { http } from "./http";

export interface Partner {
  id: string;
  name: string;
  logo_url?: string | null;
  category: string;
  description?: string | null;
  discount_details?: string | null;
  coupon?: string | null;
  link?: string | null;
  created_at: string;
}

export interface CreatePartnerPayload {
  name: string;
  category: string;
  logo_url?: string;
  description?: string;
  discount_details?: string;
  coupon?: string;
  link?: string;
}

export type UpdatePartnerPayload = Partial<CreatePartnerPayload>;

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
