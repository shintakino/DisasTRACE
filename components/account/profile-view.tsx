"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Camera } from "lucide-react";
import { createClientBrowser } from "@/lib/supabase";

export function ProfileView() {
  const { user } = useAuth();
  const supabase = createClientBrowser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize values when user loads
  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || user.user_metadata?.full_name?.split(" ")[0] || "");
      setLastName(user.user_metadata?.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "");
      setPosition(user.user_metadata?.position || "Head, CDRRMO");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          position,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSuccessMsg("Profile saved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      setSuccessMsg("Profile picture updated successfully! Refreshing details...");
      
      // Force reload auth state via standard listener
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }

      setTimeout(() => {
        setSuccessMsg("");
        window.location.reload(); // Hard refresh to ensure layout and user-menu updates sync instantly
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload avatar.");
    } finally {
      setAvatarLoading(false);
    }
  };

  // Extract initials
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.first_name + " " + user?.user_metadata?.last_name || "AD";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="w-full" key={user?.id || "loading"}>
      <Tabs defaultValue="personal" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="bg-transparent border-b border-[#E2E8F0] w-full max-w-md justify-start rounded-none h-auto p-0 gap-6">
            <TabsTrigger 
              value="personal"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base"
            >
              Personal Info
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E3A8A] data-[state=active]:bg-transparent px-2 py-3 text-base text-muted-foreground"
            >
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="personal" className="max-w-md mx-auto outline-none mt-0">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  className={`h-24 w-24 rounded-full object-cover shadow-md border-2 border-white ${avatarLoading ? 'opacity-40' : ''}`} 
                  alt="User Avatar" 
                />
              ) : (
                <div className={`h-24 w-24 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-3xl font-bold shadow-md ${avatarLoading ? 'opacity-40' : ''}`}>
                  {initials}
                </div>
              )}
              
              {avatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]" />
                </div>
              )}

              <button 
                type="button" 
                onClick={handleAvatarClick}
                disabled={avatarLoading}
                className="absolute bottom-0 right-0 h-8 w-8 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center text-[#1E3A8A] hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
                aria-label="Change avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept="image/*"
                className="hidden" 
              />
            </div>
          </div>
          
          <div className="space-y-5">
            {successMsg && (
              <div className="p-3 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs font-bold uppercase text-[#1E293B]">First Name</Label>
              <Input 
                id="firstName" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs font-bold uppercase text-[#1E293B]">Last Name</Label>
              <Input 
                id="lastName" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position" className="text-xs font-bold uppercase text-[#1E293B]">Position</Label>
              <Input 
                id="position" 
                value={position} 
                onChange={(e) => setPosition(e.target.value)}
                className="h-12 border-[#CBD5E1] rounded-xl text-base px-4 bg-white" 
              />
            </div>
            
            <Button 
              onClick={handleSaveProfile}
              disabled={loading || avatarLoading}
              className="w-full h-12 bg-[#1E3A8A] text-white hover:bg-blue-900 font-semibold rounded-xl mt-6 transition-all"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="max-w-lg mx-auto outline-none mt-0">
          <div className="text-xs font-bold uppercase text-[#1E293B] mb-4">Alert Preferences</div>
          
          <div className="space-y-4">
            <NotificationToggle 
              title="Disaster Reports" 
              description="Notify when a new disaster report is submitted by residents" 
              preferenceKey="disaster_reports"
              defaultChecked={user?.user_metadata?.notification_preferences?.disaster_reports ?? true} 
              supabase={supabase}
              user={user}
            />
            <NotificationToggle 
              title="Responder Dispatch Updates" 
              description="Notify when a responder responds or updates a status" 
              preferenceKey="dispatch_updates"
              defaultChecked={user?.user_metadata?.notification_preferences?.dispatch_updates ?? true} 
              supabase={supabase}
              user={user}
            />
            <NotificationToggle 
              title="System Announcements" 
              description="Updates, maintenance schedules, and system notices" 
              preferenceKey="system_notices"
              defaultChecked={user?.user_metadata?.notification_preferences?.system_notices ?? true} 
              supabase={supabase}
              user={user}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationToggle({ 
  title, 
  description, 
  preferenceKey,
  defaultChecked,
  supabase,
  user
}: { 
  title: string; 
  description: string; 
  preferenceKey: string;
  defaultChecked: boolean;
  supabase: any;
  user: any;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = async () => {
    if (!user) return;
    const newValue = !checked;
    setChecked(newValue);

    try {
      const currentPreferences = user.user_metadata?.notification_preferences || {};
      const updatedPreferences = {
        ...currentPreferences,
        [preferenceKey]: newValue,
      };

      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          notification_preferences: updatedPreferences,
        }
      });
    } catch (err) {
      console.error("Failed to update notification preference in metadata:", err);
    }
  };
  
  return (
    <div className="flex items-center justify-between p-5 rounded-2xl border border-[#E2E8F0] bg-white">
      <div>
        <h4 className="font-semibold text-[#1E3A8A]">{title}</h4>
        <p className="text-xs text-[#64748B] mt-1">{description}</p>
      </div>
      <button 
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
