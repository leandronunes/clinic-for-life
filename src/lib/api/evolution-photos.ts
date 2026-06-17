import { http } from "./http";

export interface EvolutionPhoto {
  id: string;
  taken_on: string;
  image_url: string;
  weight_kg?: number | null;
  fat_percentage?: number | null;
  muscle_mass_kg?: number | null;
}

export interface CreateEvolutionPhotoPayload {
  taken_on: string;
  image_url: string;
  weight_kg?: number;
  fat_percentage?: number;
  muscle_mass_kg?: number;
}

export function fetchEvolutionPhotos(studentId: string): Promise<EvolutionPhoto[]> {
  return http.get<EvolutionPhoto[]>(`/api/v1/students/${studentId}/evolution/photos`);
}

export function createEvolutionPhoto(
  studentId: string,
  payload: CreateEvolutionPhotoPayload,
): Promise<EvolutionPhoto> {
  return http.post<EvolutionPhoto>(
    `/api/v1/students/${studentId}/evolution/photos`,
    payload,
  );
}

/** Converts a File to a base64 data-URL for API transport. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
