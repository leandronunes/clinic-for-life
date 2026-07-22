import { http } from "./http";

export interface Organization {
  id: string;
  name: string;
  domain: string;
}

/** Lista pública — usada pelo seletor "entrar numa organização existente" no cadastro. */
export function fetchOrganizations(): Promise<Organization[]> {
  return http.get<Organization[]>("/api/v1/organizations");
}
