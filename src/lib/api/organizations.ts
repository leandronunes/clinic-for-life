import { http } from "./http";

export interface Organization {
  id: string;
  name: string;
  domain: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  domain?: string;
}

/** Lista pública — usada pelo seletor "entrar numa organização existente" no cadastro. */
export function fetchOrganizations(): Promise<Organization[]> {
  return http.get<Organization[]>("/api/v1/organizations");
}

/** Admin only — só permite editar a própria organização (validado no backend). */
export function updateOrganization(
  id: string,
  payload: UpdateOrganizationPayload,
): Promise<Organization> {
  return http.patch<Organization>(`/api/v1/organizations/${id}`, payload);
}
