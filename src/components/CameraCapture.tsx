import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

type Phase = "live" | "preview";

export function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      toast.error("Não foi possível acessar a câmera");
      onClose();
    }
  }, [onClose]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Start camera when dialog opens, stop when it closes.
  useEffect(() => {
    if (!open) {
      stopStream();
      setPhase("live");
      setPreviewUrl(null);
      setCapturedFile(null);
      return;
    }
    startStream();
  }, [open, startStream, stopStream]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setCapturedFile(file);
        setPreviewUrl(url);
        setPhase("preview");
        stopStream();
      },
      "image/jpeg",
      0.92,
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedFile(null);
    setPhase("live");
    startStream();
  }

  function confirm() {
    if (capturedFile) onCapture(capturedFile);
    onClose();
  }

  function handleClose() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            {phase === "live" ? "Tirar foto" : "Confirmar foto"}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black w-full aspect-[4/3]">
          {/* Live camera stream */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-full w-full object-contain ${phase === "preview" ? "hidden" : ""}`}
          />

          {/* Captured preview */}
          {phase === "preview" && previewUrl && (
            <img src={previewUrl} alt="Foto capturada" className="h-full w-full object-contain" />
          )}
        </div>

        {/* Hidden canvas used only for frame extraction */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2 p-4">
          {phase === "live" ? (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                <X className="mr-1.5 h-4 w-4" /> Cancelar
              </Button>
              <Button className="flex-1" onClick={capturePhoto}>
                <Camera className="mr-1.5 h-4 w-4" /> Capturar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={retake}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Repetir
              </Button>
              <Button className="flex-1" onClick={confirm}>
                <Check className="mr-1.5 h-4 w-4" /> Usar esta foto
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
