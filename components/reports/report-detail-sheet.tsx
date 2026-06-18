"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DetailedIncidentReport } from "@/types/reports";
import { Truck, MoreVertical, X, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = React.useState<"incident" | "resident">("resident");
  const [expandedImage, setExpandedImage] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const handleSingleReportExport = async () => {
    if (!report) return;
    setExporting(true);
    toast.promise(
      (async () => {
        const { exportSingleIncidentReportPDF } = await import("@/lib/pdf-export");
        await exportSingleIncidentReportPDF(report);
      })(),
      {
        loading: `Exporting report ${report.id} to PDF...`,
        success: "PDF exported successfully.",
        error: "Failed to export PDF.",
      }
    );
    setExporting(false);
  };

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[32px] gap-0 h-[85vh] flex flex-col">
        {/* Hidden title for screen readers to avoid DialogTitle warning */}
        <DialogTitle className="sr-only">Report Details</DialogTitle>
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A8A] mb-4"></div>
            <span className="font-bold uppercase tracking-widest text-[10px]">Loading...</span>
          </div>
        ) : report ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 flex flex-col items-center">
              {/* Header: Responders and Close Button */}
              <div className="w-full flex justify-between items-start mb-6">
                <div className="flex flex-col gap-3">
                  {report.responderName && report.responderName !== "None Assigned" ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#1A237E] text-white flex items-center justify-center font-bold text-sm">
                        {report.responderName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#1A237E] text-sm leading-tight">{report.responderName}</p>
                        <p className="text-[#1A237E]/70 text-[10px] font-bold uppercase tracking-wider">Responder</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-sm border border-dashed border-slate-200">
                        --
                      </div>
                      <div>
                        <p className="font-bold text-slate-400 text-sm leading-tight">No Responder Assigned</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Incident Log</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSingleReportExport}
                    disabled={exporting}
                    className="h-8 px-3 rounded-full bg-[#E8EAF6] text-[#1A237E] hover:bg-[#C5CAE9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                    title="Export Report to PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>
                  <button 
                    onClick={onClose}
                    className="h-8 w-8 rounded-full bg-[#E8EAF6] flex items-center justify-center text-[#1A237E] hover:bg-[#C5CAE9] transition-colors shrink-0"
                  >
                    <X className="h-4 w-4 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Vehicle Icon */}
              <div className="relative mb-3">
                <div className="h-20 w-20 rounded-full bg-[#E8EAF6] flex items-center justify-center relative overflow-hidden">
                   {/* Decorative circle shapes inside to mimic the design */}
                   <div className="absolute top-[20%] -left-[10%] w-10 h-10 rounded-full bg-slate-300/40 mix-blend-multiply" />
                   <div className="absolute bottom-[10%] -right-[10%] w-12 h-12 rounded-full bg-slate-300/40 mix-blend-multiply" />
                   <Truck className="h-10 w-10 text-[#1A237E] relative z-10 fill-[#1A237E]" />
                </div>
              </div>

              {/* ID and Vehicle Name */}
              <h2 className="text-[#1A237E] text-[22px] font-black tracking-tight mb-1">{report.id}</h2>
              <p className="text-[#1A237E]/80 font-bold text-[10px] mb-8 tracking-wider">{report.vehicleId}</p>

              {/* Tabs */}
              <div className="flex items-center gap-1 mb-8 text-[11px] font-black w-full max-w-[320px] mx-auto uppercase tracking-wide">
                <button
                  onClick={() => setActiveTab("incident")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-center rounded-full transition-colors",
                    activeTab === "incident" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Incident Information
                </button>
                <button
                  onClick={() => setActiveTab("resident")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-center rounded-full transition-colors",
                    activeTab === "resident" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  From Resident
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "resident" && (
                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Resident's Report */}
                  <div>
                    <h3 className="text-[#1A237E] font-black text-[11px] mb-3 uppercase tracking-wider">Resident's Report</h3>
                    <div className="border border-[#E8EAF6] rounded-3xl p-5 shadow-sm bg-white">
                      <div className="space-y-4 mb-4">
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-500 font-medium">Nature of Call</span>
                          <span className="font-bold text-[#1A237E]">{report.natureOfCall || "Emergency"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-500 font-medium">Type of Emergency</span>
                          <span className="font-bold text-[#1A237E]">{report.type}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-500 font-medium">Severity Level</span>
                          <span className="font-bold text-[#1A237E]">{report.severityLevel || "Critical"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px]">
                          <span className="text-slate-500 font-medium">People Involved</span>
                          <span className="font-bold text-[#1A237E]">{report.peopleInvolved || 3}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px] pt-1">
                          <span className="text-slate-500 font-medium self-start">Location</span>
                          <span className="font-bold text-[#1A237E] text-right max-w-[65%] leading-tight">{report.location}</span>
                        </div>
                      </div>

                      {/* Photo attached */}
                      {report.residentPhotoUrl && (
                        <button 
                          type="button"
                          onClick={() => setExpandedImage(report.residentPhotoUrl || null)}
                          className="relative rounded-[20px] overflow-hidden h-[140px] w-full mt-5 bg-slate-100 group block text-left"
                        >
                          <img 
                            src={report.residentPhotoUrl} 
                            alt="Scene photo" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-4 flex justify-between items-end">
                            <span className="text-white text-xs font-medium tracking-wide">RESIDENT_ATTACHMENT.jpg</span>
                            <div className="text-white bg-white/20 p-1 rounded-full group-hover:bg-white/30 transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Crew's Actual Findings */}
                  {report.status !== "RESPONDING" && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[#1A237E]/60 font-black text-[11px] uppercase tracking-wider">
                          Crew's Actual Findings
                        </h3>
                        {report.status === "ONGOING" && (
                          <Badge className="bg-[#E8EAF6] text-[#1A237E] font-black text-[10px] uppercase tracking-widest shadow-none border-none px-2 py-0.5">
                            Draft
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="text-[#1A237E] font-black text-[11px] mb-3 uppercase tracking-wider">Nature of Call</h4>
                      <div className="border border-[#E8EAF6] rounded-3xl p-5 shadow-sm bg-white">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-medium">Nature of Call</span>
                            <span className="font-bold text-[#1A237E]">{report.natureOfCall || "Emergency"}</span>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-medium">Type of Emergency</span>
                            <span className="font-bold text-[#1A237E]">{report.type}</span>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-medium">Severity Level</span>
                            <span className="font-bold text-[#1A237E]">{report.severityLevel || "Critical"}</span>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-medium">People Involved</span>
                            <span className="font-bold text-[#1A237E]">{report.peopleInvolved || 3}</span>
                          </div>
                          <div className="flex justify-between items-center text-[13px] pt-1">
                            <span className="text-slate-500 font-medium self-start">Location</span>
                            <span className="font-bold text-[#1A237E] text-right max-w-[65%] leading-tight">{report.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scroll Up indicator */}
                  <div className="text-center pt-8 pb-4 opacity-50 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">
                      Scroll Up
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "incident" && (
                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Crew's Summary findings */}
                  <div>
                    <h3 className="text-[#1A237E] font-black text-[11px] mb-3 uppercase tracking-wider">Crew Findings & Description</h3>
                    <div className="border border-[#E8EAF6] rounded-3xl p-5 shadow-sm bg-white">
                      <p className="text-slate-600 text-xs leading-relaxed font-medium">
                        {report.crewFindings || "No findings recorded by the responding crew."}
                      </p>
                    </div>
                  </div>

                  {/* Treated Patients Roster */}
                  {report.participants && report.participants.length > 0 && (
                    <div>
                      <h3 className="text-[#1A237E] font-black text-[11px] mb-3 uppercase tracking-wider">Treated Patients</h3>
                      <div className="border border-[#E8EAF6] rounded-3xl overflow-hidden shadow-sm bg-white">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-[#E8EAF6] text-[#1A237E] font-black uppercase tracking-wider text-[9px]">
                              <th className="py-3 px-4">Patient Name</th>
                              <th className="py-3 px-4">Contact</th>
                              <th className="py-3 px-4">Triage Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.participants.map((p, idx) => (
                              <tr key={idx} className="border-b border-[#E8EAF6] last:border-0 font-bold text-slate-700">
                                <td className="py-3 px-4">{p.name || `Patient #${idx + 1}`}</td>
                                <td className="py-3 px-4 text-slate-500">{p.contact || "N/A"}</td>
                                <td className="py-3 px-4">
                                  <Badge className={cn(
                                    "font-black text-[8px] uppercase tracking-wider border-none shadow-none px-2 py-0.5",
                                    p.triageStatus?.includes("Critical") || p.triageStatus?.includes("Red")
                                      ? "bg-red-100 text-red-700"
                                      : p.triageStatus?.includes("Stable") || p.triageStatus?.includes("Green")
                                        ? "bg-green-100 text-green-700"
                                        : "bg-amber-100 text-amber-700"
                                  )}>
                                    {p.triageStatus || "Stable"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Scene Photos Grid */}
                  {report.scenePhotos && report.scenePhotos.length > 0 && (
                    <div>
                      <h3 className="text-[#1A237E] font-black text-[11px] mb-3 uppercase tracking-wider">Clinical Crew Scene Photos</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {report.scenePhotos.map((photo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setExpandedImage(photo)}
                            className="relative rounded-2xl overflow-hidden h-[110px] bg-slate-100 group block text-left shadow-sm border border-slate-100"
                          >
                            <img
                              src={photo}
                              alt={`Scene photo ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-8 pb-2 px-3">
                              <span className="text-white text-[10px] font-medium tracking-wide">SCENE_PHOTO_{idx + 1}.jpg</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scroll Up indicator */}
                  <div className="text-center pt-8 pb-4 opacity-50 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer">
                      Scroll Up
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            No report selected.
          </div>
        )}
      </DialogContent>

      {/* Expanded Image Overlay */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setExpandedImage(null)}
        >
          <div className="absolute top-6 right-6">
            <button 
              type="button"
              onClick={() => setExpandedImage(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </Dialog>
  );
}
