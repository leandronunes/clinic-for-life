import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Exercise } from "@/lib/api/workouts";
import { isUploadedVideo } from "@/lib/video-url";
import { describeExercise } from "@/lib/exercise-kind";
import { VideoPlayer } from "@/components/VideoPlayer";

export function ExerciseVideoDialog({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{exercise?.name}</DialogTitle>
          <DialogDescription>{exercise ? describeExercise(exercise) : ""}</DialogDescription>
        </DialogHeader>
        {exercise && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {isUploadedVideo(exercise.video_url) ? (
              <VideoPlayer src={exercise.video_url} className="h-full w-full" />
            ) : (
              <iframe
                src={exercise.video_url}
                title={exercise.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}
        {exercise?.notes && (
          <p className="rounded-md bg-muted p-3 text-sm">
            <strong>Observação do Personal:</strong> {exercise.notes}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
