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
  ClipboardList,
  Handshake,
  LogOut,
  Menu,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/use-auth";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import type { UserRole } from "@/lib/api/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
    { title: "Comparar", url: "/aluno/comparativo", icon: Images },
    { title: "Parceiros", url: "/aluno/parceiros", icon: Handshake },
    { title: "Perfil", url: "/perfil", icon: UserCircle },
  ],
};

const EXTRA_ALUNO: NavItem[] = [
  { title: "Exames", url: "/aluno/exames", icon: FileText },
  { title: "Avaliação Biomecânica", url: "/aluno/biomecanica", icon: Activity },
  { title: "Anamnese Dinâmica", url: "/aluno/anamnese", icon: ClipboardList },
];

const EXTRA_ADMIN: NavItem[] = [{ title: "Parceiros", url: "/parceiros", icon: Handshake }];

export function MobileBottomNav() {
  const { user, signOut, effectiveRole, isImpersonating, stopImpersonating } = useAuth();
  const { canInstall, isInstalled, isIOS, install } = usePwaInstall();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = pathname.startsWith("/aluno") ? "aluno" : (effectiveRole ?? user?.role);
  let items = role ? [...MENU[role]] : [];
  if (isImpersonating) {
    items = items.filter((i) => i.url !== "/perfil");
  }
  // Show "Mais" menu for all roles to expose extras (aluno) and/or sair.
  const showMore = role === "aluno" || role === "admin" || role === "personal";
  if (showMore && role === "aluno") {
    // remove Perfil from main bar (moved into More), keep 4 + More
    items = items.filter((i) => i.url !== "/perfil");
  }
  if (isImpersonating) {
    items.push({ title: "Voltar", url: "__stop__", icon: ArrowLeftCircle });
  }
  if (items.length === 0 && !showMore) return null;

  const totalCols = items.length + (showMore ? 1 : 0);
  const colsClass =
    totalCols >= 5
      ? "grid-cols-5"
      : totalCols === 4
        ? "grid-cols-4"
        : totalCols === 3
          ? "grid-cols-3"
          : "grid-cols-2";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className={`grid ${colsClass}`}>
        {items.map((it) => {
          if (it.url === "__stop__") {
            return (
              <li key="stop">
                <button
                  type="button"
                  aria-label="Voltar ao meu perfil"
                  onClick={() => {
                    stopImpersonating();
                    navigate({ to: "/usuarios" });
                  }}
                  className="flex w-full flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
                >
                  <it.icon className="h-5 w-5" aria-hidden="true" />
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
        {showMore && (
          <li>
            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir mais opções"
                  className="flex w-full flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                  Mais
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  {role === "aluno" &&
                    EXTRA_ALUNO.map((it) => (
                      <SheetClose asChild key={it.url}>
                        <Link
                          to={it.url}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent"
                        >
                          <it.icon className="h-5 w-5" />
                          {it.title}
                        </Link>
                      </SheetClose>
                    ))}
                  {role === "admin" &&
                    EXTRA_ADMIN.map((it) => (
                      <SheetClose asChild key={it.url}>
                        <Link
                          to={it.url}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent"
                        >
                          <it.icon className="h-5 w-5" />
                          {it.title}
                        </Link>
                      </SheetClose>
                    ))}
                  {!isImpersonating && role === "aluno" && (
                    <SheetClose asChild>
                      <Link
                        to="/perfil"
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent"
                      >
                        <UserCircle className="h-5 w-5" />
                        Perfil
                      </Link>
                    </SheetClose>
                  )}
                  {!isInstalled && (
                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={() => {
                          if (canInstall) {
                            install();
                          } else if (isIOS) {
                            toast.info(
                              "No Safari: toque em Compartilhar → Adicionar à Tela de Início",
                              { duration: 6000 },
                            );
                          } else {
                            toast.info(
                              'Abra o menu do Chrome (⋮) → "Instalar aplicativo" ou toque no ícone + na barra de endereços',
                              { duration: 6000 },
                            );
                          }
                        }}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent text-left text-primary"
                      >
                        <Download className="h-5 w-5" />
                        Instalar app
                      </button>
                    </SheetClose>
                  )}

                  {isImpersonating ? (
                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={() => {
                          stopImpersonating();
                          navigate({ to: "/usuarios" });
                        }}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent text-left"
                      >
                        <ArrowLeftCircle className="h-5 w-5" />
                        Voltar ao meu perfil
                      </button>
                    </SheetClose>
                  ) : (
                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent text-left text-destructive"
                      >
                        <LogOut className="h-5 w-5" />
                        Sair
                      </button>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </li>
        )}
      </ul>
    </nav>
  );
}
