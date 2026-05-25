"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Camera } from "lucide-react";

export function ProfileView() {
  const { user } = useAuth();
  
  // Extract initials
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.first_name + " " + user?.user_metadata?.last_name || "AD";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

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
              <div className="h-24 w-24 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-3xl font-bold shadow-md">
                {initials}
              </div>
              <button 
                type="button" 
                className="absolute bottom-0 right-0 h-8 w-8 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center text-[#1E3A8A] hover:bg-slate-50 shadow-sm transition-colors"
                aria-label="Change avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs font-bold uppercase text-[#1E293B]">First Name</Label>
              <Input id="firstName" defaultValue={user?.user_metadata?.first_name || ""} className="h-12 border-[#CBD5E1] rounded-xl text-base px-4" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs font-bold uppercase text-[#1E293B]">Last Name</Label>
              <Input id="lastName" defaultValue={user?.user_metadata?.last_name || ""} className="h-12 border-[#CBD5E1] rounded-xl text-base px-4" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position" className="text-xs font-bold uppercase text-[#1E293B]">Position</Label>
              <Input id="position" defaultValue={user?.user_metadata?.position || "Head, CDRRMO"} className="h-12 border-[#CBD5E1] rounded-xl text-base px-4" />
            </div>
            
            <Button className="w-full h-12 bg-[#E2E8F0] text-[#1E3A8A] hover:bg-[#CBD5E1] font-semibold rounded-xl mt-6">
              Save
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="max-w-lg mx-auto outline-none mt-0">
          <div className="text-xs font-bold uppercase text-[#1E293B] mb-4">Alert Preferences</div>
          
          <div className="space-y-4">
            <NotificationToggle 
              title="Disaster Reports" 
              description="Notify when a new disaster report is submitted by residents" 
              defaultChecked={true} 
            />
            <NotificationToggle 
              title="Responder Dispatch Updates" 
              description="Notify when a responder responds or updates a task status" 
              defaultChecked={true} 
            />
            <NotificationToggle 
              title="System Announcements" 
              description="Updates, maintenance schedules, and system notices" 
              defaultChecked={true} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationToggle({ title, description, defaultChecked }: { title: string, description: string, defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  
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
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
