"use client"

import { useAuth } from "@/hooks/use-auth";
import { createClientBrowser } from "@/lib/supabase";
import { ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function UnauthorizedPlatformPage() {
  const { user, role, loading } = useAuth();
  const supabase = createClientBrowser();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]"></div>
      </div>
    );
  }

  const status = user?.app_metadata?.status;
  const isInactive = status === "SUSPENDED" || status === "DEACTIVATED";

  const title = isInactive 
    ? (status === "SUSPENDED" ? "Account Suspended" : "Account Deactivated")
    : "Mobile App Only";

  const description = isInactive
    ? `Your account has been ${status === "SUSPENDED" ? "suspended" : "deactivated"} by the system administrator.`
    : `The ${(role as string)?.replace('_', ' ') || 'User'} role is restricted to the DisasTRACE Mobile Application.`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="size-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1E3A8A]">{title}</CardTitle>
          <p className="text-slate-500 mt-2">
            {description}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 flex gap-3">
            <ShieldAlert className="size-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              {isInactive 
                ? "Access to the DisasTRACE platforms (both Web and Mobile) has been restricted. If you believe this is in error, please contact the CDRRMO administrator."
                : "Your account is designed for field operations. Please download the mobile app to report incidents or receive dispatches."}
            </p>
          </div>

          {!isInactive && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider text-center">
                Next Steps
              </p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside px-2">
                <li>Open the DisasTRACE App on your phone.</li>
                <li>Sign in with your registered credentials.</li>
                <li>Complete your field tasks through the mobile interface.</li>
              </ol>
            </div>
          )}

          <Button 
            onClick={handleSignOut} 
            className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 h-11 text-lg font-bold"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
