import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Activity,
  Dumbbell,
  LineChart,
  Images,
  LogOut,
  UserCircle,
  ArrowLeftCircle,
  Eye,
  Handshake,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "./ui/button";
import type { UserRole } from "@/lib/mock-api";

const MENU: Record<UserRole, { title: string; url: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Usuários", url: "/usuarios", icon: Users },
    { title: "Parceiros", url: "/parceiros", icon: Handshake },
  ],
  personal: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Meus Alunos", url: "/usuarios", icon: Users },
  ],
  aluno: [
    { title: "Meu Treino", url: "/aluno", icon: Dumbbell },
    { title: "Evolução", url: "/aluno/evolucao", icon: LineChart },
    { title: "Antes & Depois", url: "/aluno/comparativo", icon: Images },
    { title: "Bioimpedância", url: "/aluno/bioimpedancia", icon: Activity },
    { title: "Avaliação Biomecânica", url: "/aluno/biomecanica", icon: Activity },
    { title: "Perfil", url: "/perfil", icon: UserCircle },
  ],
};

export function AppSidebar() {
  const { user, signOut, effectiveRole, isImpersonating, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuRole = effectiveRole ?? user?.role;
  let items = menuRole ? MENU[menuRole] : [];
  // Quando admin/personal está visualizando como aluno, esconde a tela de "Perfil" do aluno.
  if (isImpersonating) items = items.filter((i) => i.url !== "/perfil");

  const isActive = (url: string) =>
    pathname === url || (url !== "/dashboard" && pathname.startsWith(url + "/"));

  const handleStopImpersonating = () => {
    stopImpersonating();
    navigate({ to: "/usuarios" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <BrandLogo size={36} withWordmark />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isImpersonating && (
          <div className="mx-2 mt-2 rounded-md border border-accent/40 bg-accent/10 p-2 text-xs text-sidebar-foreground">
            <div className="flex items-center gap-2 font-medium">
              <Eye className="h-3.5 w-3.5" /> Visualizando como aluno
            </div>
            <p className="mt-1 text-sidebar-foreground/70">
              Você está vendo o app pelo ponto de vista do aluno.
            </p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>
            {menuRole === "aluno" ? "Aluno" : menuRole === "personal" ? "Personal" : "Gestão"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isImpersonating && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleStopImpersonating}>
                    <ArrowLeftCircle className="h-4 w-4" />
                    <span>Voltar ao meu perfil</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2">
          <div className="mb-2 text-xs">
            <div className="font-medium text-sidebar-foreground">{user?.name}</div>
            <div className="text-sidebar-foreground/60 capitalize">{user?.role}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
