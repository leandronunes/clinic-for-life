import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Activity,
  Dumbbell,
  LineChart,
  Images,
  UserCircle,
  ArrowLeftCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/mock-api";

type NavItem = { title: string; url: string; icon: typeof Users };

const MENU: Record<UserRole, NavItem[]> = {
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Usuários", url: "/usuarios", icon: Users },
  ],
  personal: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Alunos", url: "/usuarios", icon: Users },
  ],
  aluno: [
    { title: "Treino", url: "/aluno", icon: Dumbbell },
    { title: "Evolução", url: "/aluno/evolucao", icon: LineChart },
    { title: "Bio", url: "/aluno/bioimpedancia", icon: Activity },
    { title: "Comparar", url: "/aluno/comparativo", icon: Images },
    { title: "Perfil", url: "/perfil", icon: UserCircle },
  ],
};

export function MobileBottomNav() {
  const { user, effectiveRole, isImpersonating, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const role = effectiveRole ?? user?.role;
  let items = role ? [...MENU[role]] : [];
  if (isImpersonating) {
    items = items.filter((i) => i.url !== "/perfil");
    items.push({ title: "Voltar", url: "__stop__", icon: ArrowLeftCircle });
  }
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (items.length === 0) return null;
  const colsClass =
    items.length >= 5 ? "grid-cols-5" : items.length === 4 ? "grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className={`grid ${colsClass}`}>
        {items.map((it) => {
          if (it.url === "__stop__") {
            return (
              <li key="stop">
                <button
                  type="button"
                  onClick={() => { stopImpersonating(); navigate({ to: "/usuarios" }); }}
                  className="flex w-full flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
                >
                  <it.icon className="h-5 w-5" />
                  {it.title}
                </button>
              </li>
            );
          }
          const active = pathname === it.url || pathname.startsWith(it.url + "/");
          return (
            <li key={it.url}>
              <Link
                to={it.url}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <it.icon className="h-5 w-5" />
                {it.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
