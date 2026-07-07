import { http } from "./http";
import { isOfflineMode } from "./offline-mode";

interface PresignResponse {
  upload_url: string;
  public_url: string;
}

function requestPresignedUrl(params: {
  filename: string;
  content_type: string;
  context: string;
  student_id?: string;
}): Promise<PresignResponse> {
  return http.post<PresignResponse>("/api/v1/uploads/presign", params);
}

function uploadToS3(
  uploadUrl: string,
  file: File | Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload falhou: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(file);
  });
}

/**
 * Resolves a public URL for `file`, either through the real S3 presign+PUT
 * round-trip or, in offline mode, a local `blob:` URL created client-side —
 * valid only for the current tab session, but enough to preview the upload.
 */
async function uploadFile(
  file: File | Blob,
  filename: string,
  contentType: string,
  context: string,
  studentId: string | undefined,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (isOfflineMode()) {
    onProgress?.(100);
    return URL.createObjectURL(file);
  }
  const mimeType = contentType.split(";")[0].trim();
  const { upload_url, public_url } = await requestPresignedUrl({
    filename,
    content_type: contentType,
    context,
    student_id: studentId,
  });
  await uploadToS3(upload_url, file, mimeType, onProgress);
  return public_url;
}

export function uploadVideoToS3(
  studentId: string,
  file: File | Blob,
  filename: string,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return uploadFile(file, filename, contentType, "exercise_video", studentId, onProgress);
}

export function uploadPhotoToS3(
  studentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  return uploadFile(file, file.name, mimeType, "evolution_photo", studentId, onProgress);
}

export function uploadBiomechanicalImageToS3(
  studentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  return uploadFile(file, file.name, mimeType, "biomechanical_image", studentId, onProgress);
}

export function uploadPartnerLogoToS3(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  return uploadFile(file, file.name, mimeType, "partner_logo", undefined, onProgress);
}

export function uploadExamToS3(
  studentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "application/pdf";
  return uploadFile(file, file.name, mimeType, "exam", studentId, onProgress);
}
