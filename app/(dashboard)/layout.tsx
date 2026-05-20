"use client"

import { useAuth } from "@/hooks/use-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { getNavItems, UserRole } from "@/lib/navigation";
import { Bell } from "lucide-react";
import dynamic from "next/dynamic";

const UserMenu = dynamic(() => import("@/components/dashboard/user-menu"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-4 pl-6 border-l border-[#E2E8F0]">
      <div className="flex flex-col items-end hidden sm:flex min-w-[100px]">
        <div className="h-5 w-24 bg-slate-100 animate-pulse rounded" />
        <div className="h-3 w-16 bg-slate-50 animate-pulse rounded mt-1" />
      </div>
      <div className="h-11 w-11 rounded-full bg-slate-100 animate-pulse" />
      <div className="size-5 bg-slate-50 animate-pulse rounded hidden sm:block" />
    </div>
  )
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { role } = useAuth();

  const navItems = getNavItems(role as UserRole);

  const getPageTitle = (path: string) => {
    const item = navItems.find((item) => item.url === path);
    return item ? item.title : "Dashboard";
  };

  const getRoleLabel = (role: UserRole | string | undefined) => {
    switch (role) {
      case 'pacc_admin': return 'PACC Admin'
      case 'cdrrmo_super_admin': return 'Super Admin'
      default: return 'Admin'
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[88px] shrink-0 items-center justify-between gap-2 px-10 border-b bg-white transition-all">
          <div className="flex items-center gap-6">
            <SidebarTrigger className="-ml-1 h-10 w-10 text-[#64748B]" />
            <h1 className="text-3xl font-bold tracking-tight text-[#1E3A8A]">
              {getPageTitle(pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <button className="relative p-2.5 text-[#64748B] hover:text-[#1E3A8A] transition-colors">
              <Bell className="size-7" />
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-white" />
            </button>
            <UserMenu role={role as UserRole} getRoleLabel={getRoleLabel} />
          </div>
        </header>
        <main className="flex-1 overflow-hidden bg-[#F3F4F6] p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
