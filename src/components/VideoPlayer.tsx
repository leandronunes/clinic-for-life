import { useState } from "react";
import { RefreshCw, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
};

/**
 * `<video>` wrapper that shows a friendly retry panel instead of a broken
 * player when `src` 404s — expected for the first few seconds after an
 * exercise-video upload, while the compression Lambda is still writing the
 * final S3 object (see clinic-for-life-backend/docs/video-compression.md).
 * Retrying remounts the `<video>` (via `key`) so the browser issues a fresh
 * request instead of reusing the failed load.
 */
export function VideoPlayer({ src, className }: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 text-center text-white",
          className,
        )}
      >
        <VideoOff className="h-6 w-6 text-white/70" />
        <p className="text-sm text-white/70">
          O vídeo ainda está sendo processado. Tente novamente em alguns segundos.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setAttempt((a) => a + 1);
            setFailed(false);
          }}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <video
      key={attempt}
      src={src}
      controls
      playsInline
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
