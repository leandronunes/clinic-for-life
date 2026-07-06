import { createFileRoute, redirect } from "@tanstack/react-router";

// Sitemap dinâmico não é suportado em modo SPA estático.
// Esta rota redireciona para a raiz caso seja acessada diretamente.
export const Route = createFileRoute("/sitemap.xml")({
  loader: () => {
    throw redirect({ to: "/" });
  },
});
