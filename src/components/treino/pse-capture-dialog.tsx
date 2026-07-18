import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PseScale } from "./pse-scale";

/** Pede a Percepção Subjetiva de Esforço (PSE) do treino recém-concluído.
 * "Pular" fecha sem registrar nada — não há uma segunda chance depois disso
 * (a captura acontece só neste momento, ver treino-card.tsx). */
export function PseCaptureDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pse: number) => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState<number | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setValue(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como foi o esforço desse treino?</DialogTitle>
          <DialogDescription>
            Percepção Subjetiva de Esforço (PSE), de 1 (leve) a 10 (máximo).
          </DialogDescription>
        </DialogHeader>
        <PseScale value={value} onChange={setValue} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Pular
          </Button>
          <Button
            type="button"
            disabled={value == null || isPending}
            onClick={() => value != null && onSubmit(value)}
          >
            {isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
