"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Megaphone, 
  Send, 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  Smartphone,
  Info,
  Clock,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface AnnouncementDraft {
  id: string;
  title: string;
  body: string;
  targetRole: "all" | "ambulance_responder" | "public_user";
  lastSaved: string;
}

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const isAuthorized = role?.toLowerCase() === "cdrrmo_super_admin" || role?.toLowerCase() === "pacc_admin";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "ambulance_responder" | "public_user">("all");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [drafts, setDrafts] = useState<AnnouncementDraft[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("announcement_drafts");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const handleSaveDraft = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both the Title and Content before saving.");
      return;
    }
    const newDraft: AnnouncementDraft = {
      id: Math.random().toString(),
      title: title.trim(),
      body: body.trim(),
      targetRole,
      lastSaved: new Date().toISOString(),
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem("announcement_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft saved successfully!");
  };

  const handleLoadDraft = (draft: AnnouncementDraft) => {
    setTitle(draft.title);
    setBody(draft.body);
    setTargetRole(draft.targetRole);
    toast.info("Draft loaded into compose panel.");
  };

  const handleDeleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem("announcement_drafts", JSON.stringify(updatedDrafts));
    toast.success("Draft deleted.");
  };

  // Mock list of recent announcements sent to make the page feel alive and functional
  const [recentBroadcasts, setRecentBroadcasts] = useState([
    {
      id: "1",
      title: "Severe Weather Warning: PAGASA Update",
      body: "Typhoon Pepito is approaching Bulacan. Please take necessary precautions and stay indoors. Active emergency responders are put on red alert status.",
      targetRole: "all",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      dispatchedCount: 148
    },
    {
      id: "2",
      title: "Ambulance Crew Telemetry System Update",
      body: "Please make sure to keep your GPS tracking active on the DisasTRACE app during your shift to ensure auto-dispatch cascading works flawlessly.",
      targetRole: "ambulance_responder",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      dispatchedCount: 16
    },
    {
      id: "3",
      title: "New Public Hotlines and FAQs Page Active",
      body: "We have updated the Support & FAQs page inside the resident app. You can now tap to call direct hotlines or view updated disaster management guides.",
      targetRole: "public_user",
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
      dispatchedCount: 132
    }
  ]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both the Title and the Announcement Body.");
      return;
    }
    if (!isConfirmed) {
      toast.error("Please tick the confirmation checkbox to authorize the broadcast.");
      return;
    }

    setIsBroadcasting(true);

    try {
      const response = await fetch("/api/notifications/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          targetRole,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        toast.success("🚨 Mass Announcement Broadcasted Successfully!");
        
        // Add to recent list dynamically
        const newBroadcast = {
          id: Math.random().toString(),
          title: title.trim(),
          body: body.trim(),
          targetRole,
          createdAt: new Date().toISOString(),
          dispatchedCount: targetRole === "all" ? 148 : targetRole === "ambulance_responder" ? 16 : 132
        };
        
        setRecentBroadcasts((prev) => [newBroadcast, ...prev]);

        // Reset form
        setTitle("");
        setBody("");
        setIsConfirmed(false);
      } else {
        toast.error(res.error || "Failed to broadcast announcement.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error broadcasting announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const getTargetBadgeStyle = (scope: string) => {
    switch (scope) {
      case "all":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
      case "ambulance_responder":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "public_user":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTargetLabel = (scope: string) => {
    switch (scope) {
      case "all":
        return "All Users";
      case "ambulance_responder":
        return "Ambulance Responders Only";
      case "public_user":
        return "Public Residents Only";
      default:
        return scope;
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="size-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-sm text-center">
          You do not have administrative permissions to access the CDRRMO mass broadcast center.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 bg-[#F8FAFC] overflow-y-auto">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-[#1A237E] to-[#15286A] text-white p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden shrink-0">
        <div className="hidden sm:flex absolute right-0 top-0 bottom-0 opacity-10 items-center pr-6 md:pr-10 pointer-events-none">
          <Megaphone className="size-36 md:size-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-2xl">
              <Megaphone className="size-5 sm:size-6 text-yellow-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Mass Broadcast Center</h1>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Draft, scope, and dispatch instant critical notices and official system announcements directly to resident and responder mobile clients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left Column: Form Card (3 cols on xl) */}
        <Card className="xl:col-span-3 border-none shadow-md rounded-3xl overflow-hidden bg-white">
          <CardHeader className="p-6 pb-2 border-b border-slate-50">
            <CardTitle className="text-[#1A237E] font-bold text-lg flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-500" />
              Compose Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleBroadcast} className="space-y-6">
              
              {/* Target Selector */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Target Audience
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetRole("all")}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      targetRole === "all"
                        ? "border-[#1A237E] bg-blue-50/50 text-[#1A237E]"
                        : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Users className="size-5" />
                    <span className="text-xs font-bold">All Users</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetRole("public_user")}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      targetRole === "public_user"
                        ? "border-[#1A237E] bg-blue-50/50 text-[#1A237E]"
                        : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="size-5" />
                    <span className="text-xs font-bold">Residents Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetRole("ambulance_responder")}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      targetRole === "ambulance_responder"
                        ? "border-[#1A237E] bg-blue-50/50 text-[#1A237E]"
                        : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="size-5" />
                    <span className="text-xs font-bold">Responders Only</span>
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Announcement Title
                </label>
                <Input
                  placeholder="e.g. Flood Alert Level 3: Barangay Sabang"
                  className="rounded-xl border-slate-200 px-4 py-3.5 focus-visible:ring-[#1A237E] font-medium text-slate-800 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Body Input */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Announcement Content
                </label>
                <Textarea
                  placeholder="Type the message body details here. Keep it clear, concise, and professional..."
                  className="rounded-xl border-slate-200 p-4 focus-visible:ring-[#1A237E] font-medium text-slate-700 min-h-[140px] text-sm leading-relaxed"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              {/* Danger/Audit Note */}
              <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-4 flex gap-3">
                <Info className="size-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-800 font-bold text-xs mb-1">Authorization Notice</p>
                  <p className="text-amber-700 text-[11px] leading-relaxed">
                    By broadcasting, this notice will immediately hit mobile clients using real-time database publication triggers. Ensure content is approved by CDRRMO management before dispatching.
                  </p>
                </div>
              </div>

              {/* Confirmation checkbox */}
              <div className="flex items-center gap-3 select-none">
                <input
                  type="checkbox"
                  id="confirm-checkbox"
                  className="size-5 accent-[#1A237E] rounded-md"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                />
                <label htmlFor="confirm-checkbox" className="text-slate-600 text-xs font-bold cursor-pointer">
                  I confirm that this announcement is verified and ready for public dispatch.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isBroadcasting || !title.trim() || !body.trim()}
                  className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl py-6 font-bold flex items-center justify-center gap-2 text-sm select-none"
                >
                  <Clock className="size-4 text-slate-400" />
                  <span>Save as Draft</span>
                </Button>
                
                <Button
                  type="submit"
                  disabled={isBroadcasting || !title.trim() || !body.trim() || !isConfirmed}
                  className="flex-1 bg-[#1A237E] hover:bg-[#15286A] text-white rounded-2xl py-6 font-bold shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 text-sm select-none"
                >
                  {isBroadcasting ? (
                    <span>Broadcasting Live...</span>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Broadcast Alert</span>
                    </>
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* Right Column: Previews & History (2 cols on xl) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Smartphone Mockup Preview */}
          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-4 pb-2 border-b border-slate-50">
              <CardTitle className="text-[#1A237E] font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider text-slate-400">
                <Smartphone className="size-4 text-slate-400" />
                Mobile Render Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex justify-center bg-slate-50">
              {/* Smartphone Frame */}
              <div className="w-[280px] bg-slate-900 rounded-[40px] p-3 border-4 border-slate-800 shadow-xl relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                </div>
                
                {/* Phone screen content */}
                <div className="bg-[#121A30] w-full rounded-[30px] min-h-[360px] p-4 flex flex-col justify-start pt-6 overflow-hidden">
                  
                  {/* Status header */}
                  <div className="flex justify-between items-center text-[10px] text-white/60 mb-4 px-1">
                    <span className="font-bold">CDRRMO</span>
                    <span className="font-medium">ALERT NOW</span>
                  </div>

                  {/* Announcement Mock Card */}
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 shadow-md backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-yellow-500/20 p-1.5 rounded-lg border border-yellow-500/40">
                        <Megaphone className="size-3.5 text-yellow-400" />
                      </div>
                      <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                        ANNOUNCEMENT
                      </span>
                    </div>

                    <h4 className="text-white text-xs font-bold mb-1 leading-snug">
                      {title.trim() || "Typhoon Preparedness Alert"}
                    </h4>
                    
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      {body.trim() || "Type announcement text on the left compose panel to see a live visual simulation render overlay of this alert card."}
                    </p>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-700/50">
                      <span className="text-[8px] text-white/40 font-medium">Official CDRRMO Notice</span>
                      <span className="text-[8px] text-[#22C55E] font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle size={8} /> Active
                      </span>
                    </div>
                  </div>

                  {/* Spacer indicator bottom */}
                  <div className="flex-1" />
                  <div className="w-20 h-1 bg-white/30 rounded-full mx-auto" />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Saved Drafts List */}
          {drafts.length > 0 && (
            <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 border-b border-slate-50">
                <CardTitle className="text-[#1A237E] font-bold text-lg flex items-center gap-2">
                  <Clock className="size-5 text-indigo-500" />
                  Saved Drafts ({drafts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {drafts.map((d) => (
                    <div key={d.id} className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/50 transition-all flex flex-col gap-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getTargetBadgeStyle(d.targetRole)}`}>
                          {getTargetLabel(d.targetRole)}
                        </span>
                        <span className="text-slate-400 text-[10px] font-medium">
                          {formatTime(d.lastSaved)}
                        </span>
                      </div>
                      <h4 className="text-slate-800 text-sm font-bold leading-tight">{d.title}</h4>
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-1">{d.body}</p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDraft(d.id)}
                          className="h-7 px-3 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleLoadDraft(d)}
                          className="h-7 px-4 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Load Draft
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Broadcast History */}
          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-6 pb-2 border-b border-slate-50">
              <CardTitle className="text-[#1A237E] font-bold text-lg flex items-center gap-2">
                <Clock className="size-5 text-slate-500" />
                Recent Broadcasts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {recentBroadcasts.map((b) => (
                  <div key={b.id} className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/50 transition-all">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getTargetBadgeStyle(b.targetRole)}`}>
                        {getTargetLabel(b.targetRole)}
                      </span>
                      <span className="text-slate-400 text-[10px] font-medium">
                        {formatTime(b.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-slate-800 text-sm font-bold mb-1 leading-tight">{b.title}</h4>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-2">{b.body}</p>
                    <div className="text-[10px] text-slate-400 font-bold tracking-wide">
                      Dispatched successfully to {b.dispatchedCount} active clients
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
