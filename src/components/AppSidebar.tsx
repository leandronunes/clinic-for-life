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
  ClipboardCheck,
  FileText,
  Printer,
  CalendarCheck,
  MessageCircle,
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
import { useAuth } from "@/contexts/use-auth";
import { Button } from "./ui/button";
import type { UserRole } from "@/lib/api/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";

const MENU: Record<UserRole, { title: string; url: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda", url: "/agenda", icon: CalendarCheck },
    { title: "Usuários", url: "/usuarios", icon: Users },
    { title: "Mensagens", url: "/mensagens", icon: MessageCircle },
    { title: "Assiduidade", url: "/assiduidade-alunos", icon: CalendarCheck },
    { title: "Treinos Concluídos", url: "/treinos-concluidos", icon: ClipboardCheck },
    { title: "Parceiros", url: "/parceiros", icon: Handshake },
  ],
  personal: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda", url: "/agenda", icon: CalendarCheck },
    { title: "Meus Alunos", url: "/usuarios", icon: Users },
    { title: "Mensagens", url: "/mensagens", icon: MessageCircle },
    { title: "Assiduidade", url: "/assiduidade-alunos", icon: CalendarCheck },
    { title: "Treinos Concluídos", url: "/treinos-concluidos", icon: ClipboardCheck },
  ],

  aluno: [
    { title: "Meu Treino", url: "/aluno", icon: Dumbbell },
    { title: "Minha Agenda", url: "/aluno/agenda", icon: CalendarCheck },
    { title: "Mensagens", url: "/aluno/mensagens", icon: MessageCircle },
    { title: "Assiduidade", url: "/aluno/assiduidade", icon: CalendarCheck },
    { title: "Evolução", url: "/aluno/evolucao", icon: LineChart },
    { title: "Antes & Depois", url: "/aluno/comparativo", icon: Images },
    { title: "Avaliação Biomecânica", url: "/aluno/biomecanica", icon: Activity },
    { title: "Anamnese Dinâmica", url: "/aluno/anamnese", icon: ClipboardList },
    { title: "Parceiros", url: "/aluno/parceiros", icon: Handshake },
    { title: "Exames", url: "/aluno/exames", icon: FileText },
    { title: "Perfil", url: "/perfil", icon: UserCircle },
  ],
};

const AGENDA_URLS = ["/agenda", "/aluno/agenda"];

export function AppSidebar() {
  const { user, signOut, effectiveRole, isImpersonating, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuRole = effectiveRole ?? user?.role;
  const items = (menuRole ? MENU[menuRole] : []).filter(
    (item) =>
      (item.url !== "/assiduidade-alunos" || isFeatureEnabled("attendanceCycles")) &&
      (!AGENDA_URLS.includes(item.url) || isFeatureEnabled("agendaCalendar")),
  );

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
          <BrandLogo size={36} withWordmark inverted />
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
                  <SidebarMenuButton asChild isActive={isActive("/aluno/laudo")}>
                    <Link to="/aluno/laudo" className="flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      <span>Gerar Laudo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
