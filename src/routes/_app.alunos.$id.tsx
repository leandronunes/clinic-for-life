import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/use-auth";

export const Route = createFileRoute("/_app/alunos/$id")({
  component: AlunoImpersonateRedirect,
});

/**
 * Rota de "entrada" usada por admin/personal para visualizar a experiência
 * de um aluno específico. Em vez de mostrar uma tela própria, ativa o modo
 * de impersonação e redireciona para o app do aluno (/aluno).
 */
function AlunoImpersonateRedirect() {
  const { id } = Route.useParams();
  const { hasRole, impersonateAluno, impersonatedAlunoId } = useAuth();

  useEffect(() => {
    if (hasRole("admin", "personal") && impersonatedAlunoId !== id) {
      impersonateAluno(id);
    }
  }, [id, hasRole, impersonateAluno, impersonatedAlunoId]);

  if (hasRole("aluno")) return <Navigate to="/aluno" />;
  if (!hasRole("admin", "personal")) return <Navigate to="/dashboard" />;
  return <Navigate to="/aluno" />;
}
