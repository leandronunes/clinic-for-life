import { useEffect, useRef, useState } from "react";
import { Camera, Link as LinkIcon, Upload, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export function isUploadedVideo(url?: string) {
  return !!url && (url.startsWith("blob:") || url.startsWith("data:video"));
}

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function ExercicioVideoInput({ value, onChange }: Props) {
  const initialTab = isUploadedVideo(value) ? "upload" : "youtube";
  const [tab, setTab] = useState<"youtube" | "upload">(initialTab);
  const fileRef = useRef<HTMLInputElement>(null);

  // Recording state
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo muito grande (máx. 50 MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    onChange(url);
    toast.success("Vídeo carregado");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      liveStreamRef.current = stream;
      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = stream;
        livePreviewRef.current.play().catch(() => {});
      }
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
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
        const url = URL.createObjectURL(blob);
        onChange(url);
        stream.getTracks().forEach((t) => t.stop());
        liveStreamRef.current = null;
        if (livePreviewRef.current) livePreviewRef.current.srcObject = null;
        toast.success("Gravação concluída");
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

  return (
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
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Enviar arquivo
          </Button>
          {!recording ? (
            <Button type="button" variant="outline" size="sm" onClick={startRecording}>
              <Camera className="mr-1 h-4 w-4" /> Gravar agora
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
              <Square className="mr-1 h-4 w-4" /> Parar gravação
            </Button>
          )}
        </div>

        {recording && (
          <div className="overflow-hidden rounded-md border bg-black">
            <video ref={livePreviewRef} muted playsInline className="h-48 w-full object-contain" />
          </div>
        )}

        {!recording && isUploadedVideo(value) && (
          <div className="overflow-hidden rounded-md border bg-black">
            <video src={value} controls playsInline className="h-48 w-full object-contain" />
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Formatos de vídeo aceitos (máx. 50 MB). No celular, "Gravar agora" abre a câmera.
        </p>
      </TabsContent>
    </Tabs>
  );
}
