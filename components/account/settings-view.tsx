"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { createClientBrowser } from "@/lib/supabase";
import { HospitalSettings } from "./hospital-settings";


export function SettingsView() {
  const { user, role } = useAuth();
  const supabase = createClientBrowser();

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [dispatchTimeout, setDispatchTimeout] = useState<number>(30);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.success && data.settings) {
        setDispatchTimeout(data.settings.dispatchOfferTimeoutSeconds);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setHasLoadedSettings(true);
    }
  };

  useEffect(() => {
    if (user && (role === "cdrrmo_super_admin" || role === "pacc_admin")) {
      fetchSettings();
    }
  }, [user, role]);

  const handleUpdateDispatchSettings = async () => {
    if (dispatchTimeout < 5 || dispatchTimeout > 120) {
      toast.error("Manual dispatch countdown must be between 5 and 120 seconds.");
      return;
    }
    setDispatchLoading(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchOfferTimeoutSeconds: dispatchTimeout }),
      });

      if (!response.ok) throw new Error("Failed to update settings");
      const data = await response.json();
      if (data.success) {
        toast.success("Dispatch configuration saved successfully!");
      } else {
        throw new Error(data.error || "Failed to update settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    setEmailSuccess("");
    setEmailError("");

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      
      setEmailSuccess("Confirmation links sent to both your current and new email addresses.");
      setNewEmail("");
    } catch (err: any) {
      setEmailError(err.message || "Failed to update email address.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    setPasswordLoading(true);
    setPasswordSuccess("");
    setPasswordError("");

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full" key={user?.id || "loading"}>
      <Tabs defaultValue="signin" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="bg-transparent border-b border-[#E2E8F0] w-full max-w-2xl justify-start rounded-none h-auto p-0 gap-6">
            <TabsTrigger 
              value="signin"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base"
            >
              Sign-in
            </TabsTrigger>
            {(role === "cdrrmo_super_admin" || role === "pacc_admin") && (
              <TabsTrigger 
                value="dispatch"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base"
              >
                Dispatch Settings
              </TabsTrigger>
            )}
            {role === "cdrrmo_super_admin" && (
              <TabsTrigger 
                value="hospitals"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base"
              >
                Hospital Management
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="system"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base text-muted-foreground"
            >
              System Info
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="signin" className="max-w-xl mx-auto outline-none mt-0">
          <div className="space-y-8">
            <div>
              <div className="text-xs font-bold uppercase text-[#1E293B] mb-3">Login Method</div>
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="bg-[#1E293B] text-white p-2 rounded-lg flex items-center justify-center w-10 h-10">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1E3A8A]">{user?.email || "No email detected"}</h4>
                  <p className="text-xs text-[#64748B]">You signed in with Email</p>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-[#1E293B] mb-3">Change Email Address</div>
              <div className="space-y-4">
                {emailSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
                    {emailSuccess}
                  </div>
                )}
                {emailError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-200">
                    {emailError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newEmail" className="text-sm font-semibold text-[#1E293B]">New Email Address</Label>
                  <Input 
                    id="newEmail" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address" 
                    className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
                  />
                </div>
                <Button 
                  onClick={handleUpdateEmail}
                  disabled={emailLoading || !newEmail}
                  className="w-full h-12 bg-[#1E3A8A] text-white hover:bg-blue-900 font-semibold rounded-xl transition-all"
                >
                  {emailLoading ? "Updating..." : "Update Email"}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-[#1E293B] mb-3">Change Password</div>
              <div className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-200">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-[#1E293B]">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (for safety)" 
                    className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-[#1E293B]">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password" 
                    className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
                  />
                </div>
                <Button 
                  onClick={handleUpdatePassword}
                  disabled={passwordLoading || !newPassword}
                  className="w-full h-12 bg-[#1E3A8A] text-white hover:bg-blue-900 font-semibold rounded-xl transition-all"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {(role === "cdrrmo_super_admin" || role === "pacc_admin") && (
          <TabsContent value="dispatch" className="max-w-xl mx-auto outline-none mt-0">
            <div className="space-y-8">
              <div>
                <div className="text-xs font-bold uppercase text-[#1E293B] mb-3">Incident Dispatch Configuration</div>
                <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/20 flex gap-4">
                  <div className="bg-[#1E3A8A]/10 text-[#1E3A8A] p-2 rounded-xl flex items-center justify-center w-12 h-12 shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1E3A8A] text-sm">Real-time Negotiation Offer</h4>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Configure the total duration a responder unit has to review and accept a manual dispatch offer before it automatically auto-declines and gets routed back into the triage queue.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dispatchTimeout" className="text-sm font-semibold text-[#1E293B]">
                    Manual Offer Timeout (Seconds)
                  </Label>
                  <div className="flex gap-3">
                    <Input 
                      id="dispatchTimeout" 
                      type="number"
                      min={5}
                      max={120}
                      value={dispatchTimeout}
                      onChange={(e) => setDispatchTimeout(parseInt(e.target.value) || 30)}
                      placeholder="Enter timeout duration in seconds" 
                      className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
                    />
                    <div className="bg-slate-100 border border-slate-200 text-[#475569] font-bold px-4 rounded-xl flex items-center justify-center text-sm shrink-0">
                      seconds
                    </div>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-medium leading-normal">
                    Must be a value between 5 seconds (minimum required for basic device notification delay) and 120 seconds.
                  </p>
                </div>

                <Button 
                  onClick={handleUpdateDispatchSettings}
                  disabled={dispatchLoading || !hasLoadedSettings}
                  className="w-full h-12 bg-[#1E3A8A] text-white hover:bg-blue-900 font-semibold rounded-xl transition-all shadow-md active:scale-[0.99]"
                >
                  {dispatchLoading ? "Saving Configuration..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="system" className="max-w-xl mx-auto outline-none mt-0">
          <div className="text-xs font-bold uppercase text-[#1E293B] mb-3">System</div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-5 rounded-2xl border border-[#E2E8F0] bg-white">
              <div>
                <h4 className="font-bold text-[#1E3A8A]">DisasTRACE Version</h4>
                <p className="text-xs text-[#64748B] mt-1">Current build</p>
              </div>
              <div className="text-[#1E3A8A] font-medium">v1.0.0</div>
            </div>
            
            <div className="flex items-center justify-between p-5 rounded-2xl border border-[#E2E8F0] bg-white">
              <div>
                <h4 className="font-bold text-[#1E3A8A]">Database</h4>
                <p className="text-xs text-[#64748B] mt-1">Connection status</p>
              </div>
              <div className="bg-[#E2E8F0] text-[#1E3A8A] px-3 py-1 text-[10px] font-bold tracking-wider rounded-full uppercase">
                Connected
              </div>
            </div>
          </div>
        </TabsContent>

        {role === "cdrrmo_super_admin" && (
          <TabsContent value="hospitals" className="w-full outline-none mt-0">
            <HospitalSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
