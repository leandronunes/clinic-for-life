import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Activity, Dumbbell, LineChart, Images } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const adminItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Bio", url: "/bioimpedancia", icon: Activity },
];
const alunoItems = [
  { title: "Treino", url: "/aluno", icon: Dumbbell },
  { title: "Evolução", url: "/aluno/evolucao", icon: LineChart },
  { title: "Comparar", url: "/aluno/comparativo", icon: Images },
];

export function MobileBottomNav() {
  const { hasRole } = useAuth();
  const items = hasRole("aluno") ? alunoItems : adminItems;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-3">
        {items.map((it) => {
          const active = pathname === it.url || pathname.startsWith(it.url + "/");
          return (
            <li key={it.url}>
              <Link
                to={it.url}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
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
