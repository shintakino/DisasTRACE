import { User, Settings } from "lucide-react";
import Link from "next/link";
import { ProfileView } from "@/components/account/profile-view";
import { SettingsView } from "@/components/account/settings-view";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const resolvedParams = await searchParams;
  const tab = resolvedParams.tab || "profile";

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-white">
      {/* Sidebar Navigation */}
      <div className="w-[280px] border-r border-[#E2E8F0] p-6 hidden md:block shrink-0">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-4">
          HOME / ACCOUNT
        </div>
        
        <nav className="space-y-1">
          <Link
            href="/account?tab=profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
              tab === "profile" 
                ? "bg-[#E2E8F0] text-[#1E293B] font-medium" 
                : "text-[#64748B] hover:bg-slate-50"
            }`}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>
          
          <Link
            href="/account?tab=settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
              tab === "settings" 
                ? "bg-[#E2E8F0] text-[#1E293B] font-medium" 
                : "text-[#64748B] hover:bg-slate-50"
            }`}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full overflow-y-auto">
        <div className="md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-6">
          HOME / ACCOUNT
        </div>
        
        {tab === "profile" ? <ProfileView /> : <SettingsView />}
      </div>
    </div>
  );
}
