import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from "@/lib/api/auth";
import type { ApiError } from "@/lib/api/http";
import { validateStrongPassword } from "@/lib/utils";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([]);

  const changePasswordMut = useMutation({
    mutationFn: () =>
      changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      }),
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordError(null);
      setNewPasswordErrors([]);
    },
    onError: (err: ApiError) => {
      if (err.status === 401) {
        setCurrentPasswordError(err.message || "Senha atual incorreta");
      } else {
        setNewPasswordErrors([err.message || "Não foi possível atualizar a senha"]);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPasswordError(null);
    setNewPasswordErrors([]);

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordErrors(["As senhas não coincidem"]);
      return;
    }
    const errs = validateStrongPassword(newPassword);
    if (errs.length > 0) {
      setNewPasswordErrors(errs);
      return;
    }
    changePasswordMut.mutate();
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> Alterar senha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs">
              Senha atual
            </Label>
            <Input
              id="current-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {currentPasswordError && (
              <p className="text-xs text-destructive">{currentPasswordError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs">
              Nova senha
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Mostrar/ocultar senha"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPasswordErrors.length > 0 && (
              <p className="text-xs text-destructive">
                {newPasswordErrors.length === 1 && newPasswordErrors[0].includes("coincidem")
                  ? newPasswordErrors[0]
                  : `Senha precisa de: ${newPasswordErrors.join(", ")}.`}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs">
              Confirmar nova senha
            </Label>
            <Input
              id="confirm-password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={changePasswordMut.isPending}>
              {changePasswordMut.isPending ? "Salvando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
