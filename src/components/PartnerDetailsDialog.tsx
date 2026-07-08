import { ExternalLink, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Partner } from "@/lib/api/partners";

export function PartnerDetailsDialog({
  partner,
  open,
  onOpenChange,
}: {
  partner: Partner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {partner && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
                  {partner.logo_url && (
                    <img
                      src={partner.logo_url}
                      alt={`Logo ${partner.name}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate">{partner.name}</DialogTitle>
                  <Badge variant="secondary" className="mt-1">
                    {partner.category}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3">
              {partner.description && (
                <p className="text-sm text-muted-foreground">{partner.description}</p>
              )}

              {partner.discount_details && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Tag className="h-3.5 w-3.5" /> Descontos
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{partner.discount_details}</p>
                </div>
              )}

              {partner.coupon && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Cupom:</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono">{partner.coupon}</code>
                </div>
              )}
            </div>

            {partner.link && (
              <DialogFooter>
                <Button asChild>
                  <a href={partner.link} target="_blank" rel="noopener noreferrer">
                    Visitar site <ExternalLink className="ml-1.5 h-4 w-4" />
                  </a>
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
