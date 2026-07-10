import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDatePtBR(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function validateStrongPassword(pw: string): string[] {
  const errs: string[] = [];
  if (pw.length < 8) errs.push("mínimo de 8 caracteres");
  if (!/[A-Z]/.test(pw)) errs.push("uma letra maiúscula");
  if (!/[a-z]/.test(pw)) errs.push("uma letra minúscula");
  if (!/[0-9]/.test(pw)) errs.push("um número");
  if (!/[^A-Za-z0-9]/.test(pw)) errs.push("um caractere especial");
  return errs;
}
