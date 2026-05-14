"use client"

import { useAuth, useUser } from "@clerk/nextjs";
import { ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPlatformPage() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const role = user?.publicMetadata?.role as string;
  const roleLabel = role?.replace('_', ' ') || 'User';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4">
      <Card className="max-w-md w-full border-red-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="size-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#1E3A8A]">Mobile App Only</CardTitle>
          <p className="text-slate-500 mt-2">
            The {roleLabel} role is restricted to the DisasTRACE Mobile Application.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 flex gap-3">
            <ShieldAlert className="size-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account is designed for field operations. Please download the mobile app to report incidents or receive dispatches.
            </p>
          </div>

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

          <Button 
            onClick={() => signOut()} 
            className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 h-11 text-lg font-bold"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
