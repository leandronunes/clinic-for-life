import { http } from "./http";

export interface EvolutionPhoto {
  id: string;
  measurement_id: string | null;
  taken_on: string;
  image_url: string;
}

export interface CreateEvolutionPhotoPayload {
  bioimpedance_measurement_id: string;
  image_url: string;
}

export function fetchEvolutionPhotos(studentId: string): Promise<EvolutionPhoto[]> {
  return http.get<EvolutionPhoto[]>(`/api/v1/students/${studentId}/evolution/photos`);
}

export function createEvolutionPhoto(
  studentId: string,
  payload: CreateEvolutionPhotoPayload,
): Promise<EvolutionPhoto> {
  return http.post<EvolutionPhoto>(`/api/v1/students/${studentId}/evolution/photos`, payload);
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
