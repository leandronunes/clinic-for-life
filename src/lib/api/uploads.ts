import { http } from "./http";

interface PresignResponse {
  upload_url: string;
  public_url: string;
}

function requestPresignedUrl(params: {
  filename: string;
  content_type: string;
  context: string;
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

export async function uploadVideoToS3(
  file: File | Blob,
  filename: string,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  // Strip codec params (e.g. "video/webm;codecs=vp9,opus" → "video/webm") so the
  // Content-Type header sent in the PUT exactly matches what the backend signed.
  const mimeType = contentType.split(";")[0].trim();

  const { upload_url, public_url } = await requestPresignedUrl({
    filename,
    content_type: contentType,
    context: "exercise_video",
  });
  await uploadToS3(upload_url, file, mimeType, onProgress);
  return public_url;
}

export async function uploadPhotoToS3(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  const { upload_url, public_url } = await requestPresignedUrl({
    filename: file.name,
    content_type: mimeType,
    context: "evolution_photo",
  });
  await uploadToS3(upload_url, file, mimeType, onProgress);
  return public_url;
}

export async function uploadBiomechanicalImageToS3(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "image/jpeg";
  const { upload_url, public_url } = await requestPresignedUrl({
    filename: file.name,
    content_type: mimeType,
    context: "biomechanical_image",
  });
  await uploadToS3(upload_url, file, mimeType, onProgress);
  return public_url;
}

export async function uploadExamToS3(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mimeType = file.type || "application/pdf";
  const { upload_url, public_url } = await requestPresignedUrl({
    filename: file.name,
    content_type: mimeType,
    context: "exam",
  });
  await uploadToS3(upload_url, file, mimeType, onProgress);
  return public_url;
}
