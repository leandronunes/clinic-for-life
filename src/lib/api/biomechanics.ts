import { http } from "./http";

export type BiomechanicsSlotBackend =
  | "frontal"
  | "posterior"
  | "trunk_flexion"
  | "left_side"
  | "right_side"
  | "profile_flexion";

export type BiomechanicsSlotFrontend =
  | "frontal"
  | "posterior"
  | "flexao_tronco"
  | "lado_esquerdo"
  | "lado_direito"
  | "flexao_perfil";

export const SLOT_TO_BACKEND: Record<BiomechanicsSlotFrontend, BiomechanicsSlotBackend> = {
  frontal: "frontal",
  posterior: "posterior",
  flexao_tronco: "trunk_flexion",
  lado_esquerdo: "left_side",
  lado_direito: "right_side",
  flexao_perfil: "profile_flexion",
};

export const SLOT_FROM_BACKEND: Record<BiomechanicsSlotBackend, BiomechanicsSlotFrontend> = {
  frontal: "frontal",
  posterior: "posterior",
  trunk_flexion: "flexao_tronco",
  left_side: "lado_esquerdo",
  right_side: "lado_direito",
  profile_flexion: "flexao_perfil",
};

export type BiomechanicsImages = Partial<Record<BiomechanicsSlotBackend, string>>;

export interface BiomechanicalAssessment {
  id: string;
  created_at: string;
  images: BiomechanicsImages;
}

export function fetchBiomechanicsAssessments(
  studentId: string,
): Promise<BiomechanicalAssessment[]> {
  return http.get<BiomechanicalAssessment[]>(
    `/api/v1/students/${studentId}/biomechanical_assessments`,
  );
}

export function fetchCurrentBiomechanicsAssessment(
  studentId: string,
): Promise<BiomechanicalAssessment> {
  return http.get<BiomechanicalAssessment>(
    `/api/v1/students/${studentId}/biomechanical_assessments/current`,
  );
}

export function newBiomechanicsAssessment(
  studentId: string,
): Promise<BiomechanicalAssessment> {
  return http.post<BiomechanicalAssessment>(
    `/api/v1/students/${studentId}/biomechanical_assessments/new_assessment`,
  );
}

export function uploadBiomechanicsSlot(
  studentId: string,
  slot: BiomechanicsSlotBackend,
  imageDataUrl: string,
): Promise<BiomechanicalAssessment> {
  return http.put<BiomechanicalAssessment>(
    `/api/v1/students/${studentId}/biomechanical_assessments/upload`,
    { slot, image_url: imageDataUrl },
  );
}

export function removeBiomechanicsSlot(
  studentId: string,
  slot: BiomechanicsSlotBackend,
): Promise<BiomechanicalAssessment> {
  return http.del<BiomechanicalAssessment>(
    `/api/v1/students/${studentId}/biomechanical_assessments/remove_image`,
    { body: { slot } },
  );
}
