const YOUTUBE_RE = /youtube\.com|youtu\.be/i;

/** True when `url` points to an uploaded video (S3/blob/data), not a YouTube link. */
export function isUploadedVideo(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:video")) return true;
  return url.startsWith("https://") && !YOUTUBE_RE.test(url);
}
