import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  className,
  labelClassName,
  children,
}: {
  label: string;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className={labelClassName ?? "text-xs"}>{label}</Label>
      {children}
    </div>
  );
}
