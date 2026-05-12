"use client"

import { UserButton, useUser } from "@clerk/nextjs";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { getNavItems, UserRole } from "@/lib/navigation";
import { Bell, ChevronDown } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const role = user?.publicMetadata?.role as UserRole;
  const navItems = getNavItems(role);

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
            <div className="flex items-center gap-4 pl-6 border-l border-[#E2E8F0]">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-base font-semibold text-[#1E293B] leading-tight">
                  {user?.fullName || "User Name"}
                </span>
                <span className="text-xs font-medium text-[#64748B]">
                  {getRoleLabel(role)}
                </span>
              </div>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-11 w-11 border-2 border-[#1E3A8A]/10 hover:border-[#1E3A8A]/30 transition-all",
                    userButtonTrigger: "focus:shadow-none focus:ring-0",
                  }
                }}
              />
              <ChevronDown className="size-5 text-[#64748B] hidden sm:block" />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden bg-[#F3F4F6] p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
