import { useEffect, useRef, useState } from "react";
import { Camera, Link as LinkIcon, Upload, Square, Video, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadVideoToS3 } from "@/lib/api/uploads";
import { isUploadedVideo } from "@/lib/video-url";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  studentId: string;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ExercicioVideoInput({ studentId, value, onChange, onUploadingChange }: Props) {
  const isMobile = useIsMobile();
  const initialTab = isUploadedVideo(value) ? "upload" : "youtube";
  const [tab, setTab] = useState<"youtube" | "upload">(initialTab);
  const fileRef = useRef<HTMLInputElement>(null);
  // On mobile, "Gravar agora" hands off to the device's native camera app
  // (via `capture`) instead of the in-app getUserMedia/MediaRecorder flow
  // below — the OS camera gives full controls (switch camera, zoom, flash)
  // that a custom webcam preview can't replicate. Desktop has no native
  // camera app to hand off to, so it keeps the in-app recording flow.
  const captureRef = useRef<HTMLInputElement>(null);

  // Local blob URL used only for preview while uploading
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Recording state
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement>(null);

  // Stop any active camera stream on unmount.
  useEffect(() => {
    return () => {
      liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Revoke the current preview blob whenever it's replaced or the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // After the live preview <video> element is mounted (recording=true),
  // attach the stream that was captured before the element existed in the DOM.
  useEffect(() => {
    if (recording && livePreviewRef.current && liveStreamRef.current) {
      livePreviewRef.current.srcObject = liveStreamRef.current;
      livePreviewRef.current.play().catch(() => {});
    }
  }, [recording]);

  function setUploadingState(v: boolean) {
    setUploading(v);
    onUploadingChange?.(v);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Vídeo muito grande (máx. 200 MB)");
      return;
    }

    const blob = URL.createObjectURL(file);
    setPreviewUrl(blob);
    setProgress(0);
    setUploadingState(true);

    try {
      const ext = file.name.split(".").pop() ?? "mp4";
      const filename = `exercise_${Date.now()}.${ext}`;
      const s3Url = await uploadVideoToS3(studentId, file, filename, file.type, setProgress);
      onChange(s3Url);
      toast.success("Vídeo enviado com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Falha no upload do vídeo — tente novamente");
      setPreviewUrl(null);
      onChange("");
    } finally {
      setUploadingState(false);
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      liveStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        // `mr.mimeType` reflects what the browser actually recorded with.
        // When we don't force one via the constructor (e.g. Safari, which
        // doesn't support "video/webm" at all), it's the only accurate
        // source — trusting the outer `mime`/a hardcoded "video/webm" here
        // mislabels the blob (e.g. real mp4 bytes tagged as webm), which
        // makes the upload's Content-Type wrong and playback fail afterward.
        const contentType = mr.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        setPreviewUrl(blobUrl);
        stream.getTracks().forEach((t) => t.stop());
        liveStreamRef.current = null;
        if (livePreviewRef.current) livePreviewRef.current.srcObject = null;

        setProgress(0);
        setUploadingState(true);
        try {
          const ext = contentType.split(";")[0].split("/")[1] || "webm";
          const filename = `exercise_recorded_${Date.now()}.${ext}`;
          const s3Url = await uploadVideoToS3(studentId, blob, filename, contentType, setProgress);
          onChange(s3Url);
          toast.success("Gravação enviada com sucesso");
        } catch (err) {
          console.error(err);
          toast.error("Falha no upload da gravação — tente novamente");
          setPreviewUrl(null);
          onChange("");
        } finally {
          setUploadingState(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  // The URL to render in the preview: prefer local blob while uploading, else the persisted S3 URL
  const displayUrl = uploading ? previewUrl : isUploadedVideo(value) ? value : null;
  // Video removal is disabled mid-upload/recording — `value` may still be stale
  // or empty at that point, and the in-progress UI already takes over below.
  const hasVideo = !!value && !uploading && !recording;

  return (
    <div className="space-y-2">
      {hasVideo && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs">
          <span className="truncate text-muted-foreground">
            {isUploadedVideo(value) ? "Vídeo anexado" : value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto shrink-0 gap-1 px-2 py-1 text-destructive hover:text-destructive"
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover vídeo
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "youtube" | "upload")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="youtube" className="gap-2">
            <LinkIcon className="h-3.5 w-3.5" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Video className="h-3.5 w-3.5" /> Gravar / Enviar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="mt-2">
          <Input
            placeholder="https://www.youtube.com/embed/..."
            value={isUploadedVideo(value) ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={200}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cole o link no formato embed do YouTube.
          </p>
        </TabsContent>

        <TabsContent value="upload" className="mt-2 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={captureRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || recording}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" /> Enviar arquivo
            </Button>
            {!recording ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => (isMobile ? captureRef.current?.click() : startRecording())}
              >
                <Camera className="mr-1 h-4 w-4" /> Gravar agora
              </Button>
            ) : (
              <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                <Square className="mr-1 h-4 w-4" /> Parar gravação
              </Button>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enviando para o servidor… {progress}%
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {recording && (
            <div className="overflow-hidden rounded-md border bg-black">
              <video
                ref={livePreviewRef}
                muted
                playsInline
                className="h-48 w-full object-contain"
              />
            </div>
          )}

          {!recording && displayUrl && (
            <div className="overflow-hidden rounded-md border bg-black">
              <video src={displayUrl} controls playsInline className="h-48 w-full object-contain" />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Formatos de vídeo aceitos (máx. 200 MB). No celular, "Gravar agora" abre o app de câmera
            do aparelho.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
