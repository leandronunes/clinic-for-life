import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
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
  apiCreateParceiro,
  apiDeleteParceiro,
  apiListParceiros,
  apiUpdateParceiro,
  PARCEIRO_CATEGORIAS,
  type Parceiro,
  type ParceiroCategoria,
} from "@/lib/mock-api";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parceiros")({
  component: ParceirosPage,
});


function ParceirosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["parceiros"],
    queryFn: () => apiListParceiros().then((r) => r.data),
  });

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Parceiro | null>(null);

  if (user?.role !== "admin") return <Navigate to="/dashboard" />;

  const removeMut = useMutation({
    mutationFn: (id: string) => apiDeleteParceiro(id),
    onSuccess: () => {
      toast.success("Parceiro removido");
      qc.invalidateQueries({ queryKey: ["parceiros"] });
    },
  });

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
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
                    <img src={p.logo_url} alt={`Logo ${p.nome}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.nome}</div>
                    <Badge variant="secondary" className="mt-1">
                      {p.categoria}
                    </Badge>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{p.descricao}</p>
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {p.link} <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover "${p.nome}"?`)) removeMut.mutate(p.id);
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
  initial?: Parceiro;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [logo_url, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [categoria, setCategoria] = useState<ParceiroCategoria>(
    initial?.categoria ?? "Nutrição",
  );
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [link, setLink] = useState(initial?.link ?? "");

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { nome: nome.trim(), logo_url: logo_url.trim(), categoria, descricao: descricao.trim(), link: link.trim() };
      if (mode === "edit" && initial) return apiUpdateParceiro(initial.id, payload);
      return apiCreateParceiro(payload);
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Parceiro atualizado" : "Parceiro cadastrado");
      onSaved();
    },
    onError: () => toast.error("Falha ao salvar parceiro"),
  });

  const valid = nome.trim() && logo_url.trim() && descricao.trim() && link.trim();

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{mode === "edit" ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
        <DialogDescription>
          Os parceiros são exibidos na vitrine pública do rodapé do app.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) mut.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="p-nome">Nome</Label>
          <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-logo">Logotipo (URL)</Label>
          <Input
            id="p-logo"
            placeholder="https://…/logo.png"
            value={logo_url}
            onChange={(e) => setLogoUrl(e.target.value)}
            required
          />
          {logo_url && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-border bg-background">
                <img src={logo_url} alt="Pré-visualização" className="h-full w-full object-cover" />
              </div>
              pré-visualização
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={(v) => setCategoria(v as ParceiroCategoria)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARCEIRO_CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
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
            required
          />
        </div>
        <DialogFooter>
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
