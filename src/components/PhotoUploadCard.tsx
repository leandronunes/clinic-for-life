import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, ImagePlus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { BioimpedanceMeasurement } from "@/lib/api/bioimpedance";
import { createEvolutionPhoto, deleteEvolutionPhoto } from "@/lib/api/evolution-photos";
import { uploadPhotoToS3 } from "@/lib/api/uploads";

type CameraDialogProps = {
  open: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
};

function CameraDialog({ open, onCapture, onClose }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        toast.error("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        onClose();
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onClose]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture, onClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tirar foto</DialogTitle>
        </DialogHeader>
        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={capture}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg brand-gradient px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Camera className="h-4 w-4" /> Capturar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  alunoId: string;
  alunoEmail: string;
  measurements: BioimpedanceMeasurement[];
  onSaved: () => void;
};

export function PhotoUploadCard({ alunoId, alunoEmail, measurements, onSaved }: Props) {
  const [measurementId, setMeasurementId] = useState<string>("");
  const [replacingPhoto, setReplacingPhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

  const selectedMeasurement = measurements.find((m) => m.id === measurementId) ?? null;
  const existingPhotoUrl = selectedMeasurement?.photo_url ?? null;
  const existingPhotoId = selectedMeasurement?.photo_id ?? null;
  const showExisting = !!existingPhotoUrl && !replacingPhoto;
  const showUpload = !!measurementId && (!existingPhotoUrl || replacingPhoto);

  const mut = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(0);
      if (existingPhotoId) {
        await deleteEvolutionPhoto(alunoId, existingPhotoId);
      }
      const imageUrl = await uploadPhotoToS3(alunoId, file, setUploadProgress);
      return createEvolutionPhoto(alunoId, {
        bioimpedance_measurement_id: measurementId,
        image_url: imageUrl,
      });
    },
    onSuccess: () => {
      toast.success(`Foto de evolução salva${alunoEmail ? ` para ${alunoEmail}` : ""}`);
      setMeasurementId("");
      setReplacingPhoto(false);
      clearFile();
      setUploadProgress(0);
      onSaved();
    },
    onError: (err: unknown) => {
      const message = (err as { message?: string })?.message ?? "Falha ao salvar a foto";
      toast.error(message);
      setUploadProgress(0);
    },
  });

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
    setFileName(f.name);
    setPendingFile(f);
  };

  const clearFile = () => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName("");
    setPendingFile(null);
  };

  const handleMeasurementChange = (id: string) => {
    clearFile();
    setReplacingPhoto(false);
    setMeasurementId(id);
  };

  const cancelReplace = () => {
    clearFile();
    setReplacingPhoto(false);
  };

  return (
    <Card className="shadow-soft border-accent/30">
      <CardHeader>
        <CardTitle className="text-base">Upload de Foto de Evolução</CardTitle>
        <p className="text-xs text-muted-foreground">
          Tire uma foto agora pelo celular ou envie uma imagem já existente para registrar a
          evolução visual deste aluno.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
            e.target.value = "";
          }}
        />

        <CameraDialog
          open={cameraOpen}
          onCapture={handleFile}
          onClose={() => setCameraOpen(false)}
        />

        {/* Step 1: select measurement first */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            A qual medição InBody esta foto se refere?
          </p>
          {measurements.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma medição cadastrada. Importe um CSV InBody primeiro.
            </p>
          ) : (
            <Select
              value={measurementId}
              onValueChange={handleMeasurementChange}
              disabled={mut.isPending}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecione a data da medição" />
              </SelectTrigger>
              <SelectContent>
                {measurements.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {new Date(m.measured_on).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    — {m.weight_kg.toFixed(1)} kg
                    {m.photo_url ? " · com foto" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Step 2a: existing photo for the selected measurement */}
        {showExisting && existingPhotoUrl && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Foto associada a esta medição:</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <img
                src={existingPhotoUrl}
                alt="Foto de evolução existente"
                className="max-h-64 w-full object-contain bg-muted"
              />
            </div>
            <button
              type="button"
              onClick={() => setReplacingPhoto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <ImagePlus className="h-4 w-4" /> Trocar foto
            </button>
          </div>
        )}

        {/* Step 2b: upload area when no existing photo or user wants to replace */}
        {showUpload && (
          <>
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={preview}
                  alt={fileName}
                  className="max-h-80 w-full object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
                {fileName && (
                  <div className="border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground truncate">
                    {fileName}
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => galleryRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  drag ? "border-accent bg-accent/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full brand-gradient text-primary-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold">Arraste uma foto ou clique para enviar</h3>
                <p className="mt-1 text-xs text-muted-foreground">Formatos: JPG, PNG, WEBP</p>
              </div>
            )}

            {!preview && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Camera className="h-4 w-4" /> Tirar foto
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg brand-gradient px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <ImagePlus className="h-4 w-4" /> Escolher imagem
                </button>
              </div>
            )}

            {pendingFile && (
              <>
                {mut.isPending && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full brand-gradient transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">{uploadProgress}%</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => mut.mutate(pendingFile)}
                    disabled={mut.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg brand-gradient px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {mut.isPending
                      ? "Enviando..."
                      : existingPhotoId
                        ? "Substituir foto"
                        : "Salvar foto de evolução"}
                  </button>
                  <button
                    type="button"
                    onClick={replacingPhoto ? cancelReplace : clearFile}
                    disabled={mut.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {replacingPhoto && !pendingFile && (
              <button
                type="button"
                onClick={cancelReplace}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Cancelar troca
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
