"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DetailedIncidentReport } from "@/types/reports";
import {
  Clock,
  MapPin,
  User,
  FileText,
  Camera,
  History,
  Users,
  AlertCircle,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportDetailSheetProps {
  reportId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportDetailSheet({
  reportId,
  isOpen,
  onClose,
}: ReportDetailSheetProps) {
  const [report, setReport] = React.useState<DetailedIncidentReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (reportId && isOpen) {
      setLoading(true);
      fetch(`/api/reports/${reportId}`)
        .then((res) => res.json())
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch report details:", err);
          setLoading(false);
        });
    } else {
      setReport(null);
    }
  }, [reportId, isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl p-0 flex flex-col border-l-0 shadow-2xl">
        <SheetHeader className="p-8 bg-[#1E3A8A] text-white">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-blue-100 border-blue-400/50 font-mono tracking-wider">
              {report?.id || "LOADING..."}
            </Badge>
            {report && (
              <Badge
                className={cn(
                  "font-black text-[10px] tracking-widest px-3 py-1 border-none shadow-sm",
                  report.status === "SUBMITTED" ? "bg-green-500 text-white" :
                  report.status === "DRAFT" ? "bg-yellow-500 text-white" :
                  "bg-slate-400 text-white"
                )}
              >
                {report.status}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
            {report?.type || "Incident Report"}
          </SheetTitle>
          <SheetDescription className="text-blue-200 flex items-center gap-2 font-medium mt-2">
            <Clock className="h-4 w-4" />
            {report ? `${report.date} • ${report.time}` : "Gathering information..."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 bg-slate-50">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A8A] mb-4"></div>
              <span className="font-bold uppercase tracking-widest text-[10px]">Accessing Database...</span>
            </div>
          ) : report ? (
            <div className="p-8 space-y-10 pb-20">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="h-3 w-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Responder</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{report.responderName}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Shield className="h-3 w-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Vehicle ID</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{report.vehicleId}</p>
                </div>
              </div>

              {/* Location */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#1E3A8A]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Incident Location</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-sm font-bold text-slate-700 leading-tight">{report.location}</p>
                </div>
              </section>

              {/* Photos */}
              {report.scenePhotos.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Camera className="h-4 w-4 text-[#1E3A8A]" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Scene Photos</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {report.scenePhotos.map((photo, i) => (
                      <div key={i} className="group relative aspect-video rounded-xl overflow-hidden border-2 border-white shadow-md bg-slate-200">
                        <img
                          src={photo}
                          alt={`Scene photo ${i + 1}`}
                          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Logs */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <History className="h-4 w-4 text-[#1E3A8A]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Response Timeline</h3>
                </div>
                <div className="space-y-0 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  {report.logs.map((log, i) => (
                    <div key={i} className="flex gap-6 relative py-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full bg-white border-2 flex items-center justify-center shrink-0 z-10 shadow-sm",
                        i === 0 ? "border-blue-500" : "border-slate-200"
                      )}>
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          i === 0 ? "bg-blue-500" : "bg-slate-300"
                        )} />
                      </div>
                      <div className="flex flex-col gap-1 pt-1">
                        <p className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          i === 0 ? "text-blue-600" : "text-slate-700"
                        )}>{log.action}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Narrative */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-[#1E3A8A]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Responder Narrative</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm italic text-slate-600 text-sm leading-relaxed border-l-4 border-l-[#1E3A8A]">
                  "{report.description || "No narrative findings submitted for this incident."}"
                </div>
              </section>

              {/* Participants */}
              {report.participants && report.participants.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#1E3A8A]" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Involved Parties</h3>
                  </div>
                  <div className="grid gap-3">
                    {report.participants.map((person, i) => (
                      <div key={i} className="p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between group hover:border-[#1E3A8A]/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border group-hover:bg-blue-50 transition-colors">
                            <User className="h-5 w-5 text-slate-400 group-hover:text-[#1E3A8A]" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{person.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{person.contact}</p>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "text-[10px] font-black tracking-widest px-3 py-1 shadow-none",
                            person.triageStatus === "Red" && "bg-red-500 text-white",
                            person.triageStatus === "Yellow" && "bg-yellow-500 text-white",
                            person.triageStatus === "Green" && "bg-green-500 text-white"
                          )}
                        >
                          {person.triageStatus.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Select an incident to view details.
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
