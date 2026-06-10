import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Activity,
  Dumbbell,
  LineChart,
  Images,
  LogOut,
  UserCircle,
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
    { title: "Perfil", url: "/perfil", icon: UserCircle },
  ],
};

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = user ? MENU[user.role] : [];
  const isActive = (url: string) =>
    pathname === url || (url !== "/dashboard" && pathname.startsWith(url + "/"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <BrandLogo size={36} withWordmark />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {user?.role === "aluno" ? "Aluno" : user?.role === "personal" ? "Personal" : "Gestão"}
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
