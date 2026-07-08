import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPartners,
  createPartner,
  updatePartner,
  deletePartner,
  CATEGORY_FROM_BACKEND,
  type Partner,
  type PartnerCategory,
} from "@/lib/api/partners";
import { uploadPartnerLogoToS3 } from "@/lib/api/uploads";
import { useAuth } from "@/contexts/use-auth";
import { PartnerDetailsDialog } from "@/components/PartnerDetailsDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parceiros")({
  component: ParceirosPage,
});

function ParceirosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["parceiros"],
    queryFn: () => fetchPartners(),
  });

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [viewing, setViewing] = useState<Partner | null>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => deletePartner(id),
    onSuccess: () => {
      toast.success("Parceiro removido");
      qc.invalidateQueries({ queryKey: ["parceiros"] });
    },
  });

  if (user?.role !== "admin") return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Parceiros</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a vitrine pública de parceiros exibida no rodapé do app.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo parceiro
            </Button>
          </DialogTrigger>
          <ParceiroFormDialog
            mode="create"
            onClose={() => setOpenNew(false)}
            onSaved={() => {
              setOpenNew(false);
              qc.invalidateQueries({ queryKey: ["parceiros"] });
            }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
                    {p.logo_url && (
                      <img
                        src={p.logo_url}
                        alt={`Logo ${p.name}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <Badge variant="secondary" className="mt-1">
                      {CATEGORY_FROM_BACKEND[p.category]}
                    </Badge>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
                <button
                  type="button"
                  onClick={() => setViewing(p)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver detalhes <ExternalLink className="h-3 w-3" />
                </button>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover "${p.name}"?`)) removeMut.mutate(p.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ParceiroFormDialog
            mode="edit"
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["parceiros"] });
            }}
          />
        )}
      </Dialog>

      <PartnerDetailsDialog
        partner={viewing}
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
      />
    </div>
  );
}

const PT_CATEGORIES: { value: PartnerCategory; label: string }[] = [
  { value: "Nutrition", label: "Nutrição" },
  { value: "Physiotherapy", label: "Fisioterapia" },
  { value: "Sports Medicine", label: "Medicina Esportiva" },
  { value: "Supplementation", label: "Suplementação" },
  { value: "Aesthetics", label: "Estética" },
  { value: "Laboratories", label: "Laboratórios" },
];

function LogoField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um arquivo de imagem");
        return;
      }
      setUploading(true);
      setProgress(0);
      try {
        const url = await uploadPartnerLogoToS3(file, setProgress);
        onChange(url);
      } catch {
        toast.error("Falha ao enviar imagem");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <Label>Logotipo</Label>

      {value ? (
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
            <img src={value} alt="Logo do parceiro" className="h-full w-full object-contain p-1" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              Trocar imagem
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
            >
              Remover
            </button>
          </div>
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
          onClick={() => !uploading && !disabled && fileRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            drag ? "border-accent bg-accent/5" : "border-border hover:bg-muted/30"
          } ${uploading || disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </div>
          <p className="mt-2 text-sm font-medium">
            {uploading ? `Enviando… ${progress}%` : "Clique ou arraste uma imagem"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, WEBP, SVG</p>
        </div>
      )}

      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Secondary: manual URL */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou informe uma URL</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="https://…/logo.png"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || uploading}
          className="text-sm"
        />
        {value && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => onChange("")}
            aria-label="Limpar URL"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ParceiroFormDialog({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Partner;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [category, setCategory] = useState<PartnerCategory>(initial?.category ?? "Nutrition");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [discountDetails, setDiscountDetails] = useState(initial?.discount_details ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [coupon, setCoupon] = useState(initial?.coupon ?? "");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        logo_url: logoUrl.trim() || undefined,
        category,
        description: description.trim() || undefined,
        discount_details: discountDetails.trim() || undefined,
        link: link.trim() || undefined,
        coupon: coupon.trim() || undefined,
      };
      if (mode === "edit" && initial) return updatePartner(initial.id, payload);
      return createPartner(payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Parceiro atualizado" : "Parceiro cadastrado");
      onSaved();
    },
    onError: () => toast.error("Falha ao salvar parceiro"),
  });

  const valid = name.trim();

  return (
    <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
        <DialogDescription>
          Os parceiros são exibidos na vitrine pública do rodapé do app.
        </DialogDescription>
      </DialogHeader>
      <form
        className="flex flex-1 flex-col overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) mut.mutate();
        }}
      >
        <div className="space-y-3 overflow-y-auto p-1">
          <div className="space-y-1.5">
            <Label htmlFor="p-nome">Nome</Label>
            <Input id="p-nome" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <LogoField value={logoUrl} onChange={setLogoUrl} disabled={mut.isPending} />

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PartnerCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-descontos">Descontos</Label>
            <Textarea
              id="p-descontos"
              rows={3}
              placeholder="Ex.: 15% de desconto na primeira consulta para alunos do Núcleo For Life."
              value={discountDetails}
              onChange={(e) => setDiscountDetails(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-link">Link</Label>
            <Input
              id="p-link"
              type="url"
              placeholder="https://parceiro.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-coupon">Cupom (opcional)</Label>
            <Input
              id="p-coupon"
              placeholder="Ex.: FORLIFE10"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid || mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
