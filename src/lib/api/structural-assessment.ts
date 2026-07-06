import { http } from "./http";

export interface StructuralAssessment {
  scoliosis: boolean;
  spine_rotation: boolean;
  hip_rotation: boolean;
  scapular_girdle_imbalance: boolean;
  scapular_dyskinesis: boolean;
  shortening: boolean;
  limb_length_difference: boolean;
  pelvic_anteversion: boolean;
  pelvic_retroversion: boolean;
  knee_valgus: boolean;
  knee_varus: boolean;
  cavus_foot_arch: boolean;
  flat_foot_arch: boolean;
}

export type UpdateStructuralPayload = Partial<StructuralAssessment>;

/** Maps PT frontend keys to EN backend field names. */
export const STRUCTURAL_KEY_MAP: Record<string, keyof StructuralAssessment> = {
  escoliose: "scoliosis",
  rotacao_coluna: "spine_rotation",
  rotacao_quadril: "hip_rotation",
  desequilibrio_cintura_escapular: "scapular_girdle_imbalance",
  discinesia_escapular: "scapular_dyskinesis",
  encurtamento: "shortening",
  diferenca_tamanho_membros: "limb_length_difference",
  anteversao_pelvica: "pelvic_anteversion",
  retroversao_pelvica: "pelvic_retroversion",
  joelho_valgo: "knee_valgus",
  joelho_varo: "knee_varus",
  arco_plantar_cavo: "cavus_foot_arch",
  arco_plantar_plano: "flat_foot_arch",
};

export function fetchStructuralAssessment(studentId: string): Promise<StructuralAssessment> {
  return http.get<StructuralAssessment>(`/api/v1/students/${studentId}/structural_assessment`);
}

export function updateStructuralAssessment(
  studentId: string,
  payload: UpdateStructuralPayload,
): Promise<StructuralAssessment> {
  return http.put<StructuralAssessment>(
    `/api/v1/students/${studentId}/structural_assessment`,
    payload,
  );
}
