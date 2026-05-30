"use client"

import { useAuth } from "@/hooks/use-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { getNavItems, UserRole } from "@/lib/navigation";
import { Bell } from "lucide-react";
import dynamic from "next/dynamic";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { useEffect } from "react";
import { createClientBrowser } from "@/lib/supabase";
import { toast } from "sonner";

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
  const { user, role } = useAuth();
  const router = useRouter();

  // Global Realtime Incident & Siren alerts listener for PACC Admins on other pages
  useEffect(() => {
    if (!user || (role !== 'pacc_admin' && role !== 'cdrrmo_super_admin')) return;

    // Skip alerts/sounds if already on the verification page to prevent duplicate notifications
    if (pathname === '/verification') return;

    const supabase = createClientBrowser();
    
    // Synthesize alert warnings using standard Web Audio API (cross-browser compatible)
    const playAlert = (type: 'emergency' | 'warning') => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        if (type === 'emergency') {
          const playTone = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          const now = ctx.currentTime;
          playTone(960, now, 0.3);
          playTone(770, now + 0.35, 0.3);
          playTone(960, now + 0.7, 0.3);
          playTone(770, now + 1.05, 0.3);
        } else {
          const playTone = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          const now = ctx.currentTime;
          playTone(587.33, now, 0.25);
          playTone(587.33, now + 0.3, 0.25);
        }
      } catch (err) {
        console.error("Layout Audio Alert failed:", err);
      }
    };

    console.log('[GlobalTriageAlert] Subscribing to database updates...');

    const channel = supabase
      .channel("global-layout-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "verification_requests" },
        (payload) => {
          console.log("[GlobalTriageAlert] New request received:", payload.new);
          const newRequest = payload.new;
          if (newRequest.status !== 'PENDING') return;

          const isEmergency = newRequest.nature === "EMERGENCY";
          const reqNum = newRequest.request_id || newRequest.requestId || "REQ-NEW";
          const reqType = newRequest.type || "Incident";
          const reqLoc = newRequest.location_description || "Baliwag City";

          // Play alarm audio alert
          playAlert(isEmergency ? 'emergency' : 'warning');

          // Trigger Sonner toast notification with custom redirect action
          if (isEmergency) {
            toast.error(`🚨 INCOMING EMERGENCY: ${reqType} reported!`, {
              duration: 12000,
              description: `Location: ${reqLoc} (${reqNum}). Click triage button to open.`,
              action: {
                label: "Triage Now",
                onClick: () => router.push('/verification')
              }
            });
          } else {
            toast.warning(`⚠️ NEW INCIDENT REPORT: ${reqType} submitted.`, {
              duration: 8000,
              description: `Location: ${reqLoc} (${reqNum}). Click review button to open.`,
              action: {
                label: "Review",
                onClick: () => router.push('/verification')
              }
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents" },
        (payload) => {
          const newInc = payload.new;
          const oldInc = payload.old;
          if (!newInc || !oldInc) return;

          const isPaccManual = newInc.dispatch_method === "PACC_MANUAL" || newInc.dispatchMethod === "PACC_MANUAL";
          const noResponder = !newInc.responder_id && !newInc.current_offer_responder_id && !newInc.responderId && !newInc.currentOfferResponderId;
          const wasAlreadyManual = oldInc.dispatch_method === "PACC_MANUAL" || oldInc.dispatchMethod === "PACC_MANUAL";
          const hadResponder = oldInc.responder_id || oldInc.current_offer_responder_id || oldInc.responderId || oldInc.currentOfferResponderId;
          
          if (isPaccManual && noResponder && (!wasAlreadyManual || hadResponder)) {
            playAlert('emergency');
            toast.error(`🚨 PACC MANUAL DISPATCH REQUIRED!`, {
              duration: 12000,
              description: "A responder rejected the offer or the timer expired. Click here to assign backup.",
              action: {
                label: "Dispatch",
                onClick: () => router.push('/verification')
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, pathname]);

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
            <NotificationDropdown />
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
