import { Navigate, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { PwaInstallButton } from "./PwaInstallButton";
import { useAuth } from "@/contexts/use-auth";
import { BrandLogo } from "./BrandLogo";

export function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BrandLogo size={56} withWordmark />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="hidden md:inline-flex" />
            <div className="md:hidden">
              <BrandLogo size={28} withWordmark />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <PwaInstallButton />
              <div className="hidden text-right text-xs md:block">
                <div className="font-medium text-foreground">{user.name}</div>
                <div className="text-muted-foreground capitalize">{user.role}</div>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
            <Outlet />
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
