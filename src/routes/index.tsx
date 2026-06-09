import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === "aluno") return <Navigate to="/aluno" />;
  return <Navigate to="/dashboard" />;
}
