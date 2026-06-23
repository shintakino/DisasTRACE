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
  const [activeTab, setActiveTab] = React.useState<"incident" | "resident" | "patient_care" | "trip_ticket">("resident");
  const [expandedImage, setExpandedImage] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [selectedPcrIdx, setSelectedPcrIdx] = React.useState(0);


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
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8 text-[10px] font-black w-full max-w-[420px] mx-auto uppercase tracking-wide">
                <button
                  onClick={() => setActiveTab("resident")}
                  className={cn(
                    "flex-1 min-w-[80px] py-2 px-1 text-center rounded-full transition-colors",
                    activeTab === "resident" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  From Resident
                </button>
                <button
                  onClick={() => setActiveTab("incident")}
                  className={cn(
                    "flex-1 min-w-[80px] py-2 px-1 text-center rounded-full transition-colors",
                    activeTab === "incident" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Crew Findings
                </button>
                {report.patientCareReports && report.patientCareReports.length > 0 && (
                  <button
                    onClick={() => { setActiveTab("patient_care"); setSelectedPcrIdx(0); }}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 px-1 text-center rounded-full transition-colors",
                      activeTab === "patient_care" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Patient Care
                  </button>
                )}
                {report.driverTripTicket && (
                  <button
                    onClick={() => setActiveTab("trip_ticket")}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 px-1 text-center rounded-full transition-colors",
                      activeTab === "trip_ticket" ? "bg-[#E8EAF6] text-[#1A237E]" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Trip Ticket
                  </button>
                )}
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
                          <span className="font-bold text-[#1A237E]">{report.residentPeopleInvolved || report.peopleInvolved || 2}</span>
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
                            <span className="font-bold text-[#1A237E]">{report.peopleInvolved || 1}</span>
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

              {activeTab === "patient_care" && report.patientCareReports && report.patientCareReports.length > 0 && (
                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Multi-patient Selector */}
                  {report.patientCareReports.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                      {report.patientCareReports.map((p: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPcrIdx(idx)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors",
                            selectedPcrIdx === idx ? "bg-[#1E3A8A] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          Patient {idx + 1}: {p.patientName || "N/A"}
                        </button>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const pcr = report.patientCareReports[selectedPcrIdx];
                    if (!pcr) return <p className="text-slate-400 text-xs">No Patient Care Report found.</p>;
                    return (
                      <div className="space-y-6 text-left">
                        {/* Header card with export */}
                        <div className="flex justify-between items-center bg-[#E8EAF6] p-4 rounded-2xl border border-blue-100">
                          <div>
                            <p className="text-[#1A237E] font-black text-sm">{pcr.patientName || "Unnamed Patient"}</p>
                            <p className="text-slate-500 text-[10px] font-bold">PRE-HOSPITAL CARE REPORT · {pcr.patientAge ? `${pcr.patientAge} yrs` : "Age N/A"} · {pcr.patientGender || "Gender N/A"}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const { exportPatientCareReportPDF } = await import("@/lib/pdf-export");
                              await exportPatientCareReportPDF(pcr, report.id, selectedPcrIdx + 1);
                            }}
                            className="h-8 px-3 rounded-full bg-[#1A237E] text-white hover:bg-blue-800 transition-colors text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>

                        {/* Patient Profile */}
                        <div>
                          <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Patient Profile</h4>
                          <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Address</span><span className="font-bold text-[#1A237E]">{pcr.patientAddress || "N/A"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Contact</span><span className="font-bold text-[#1A237E]">{pcr.patientContact || "N/A"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Call Type</span><span className="font-bold text-[#1A237E]">{pcr.emergencyType?.callType || "Medical"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Chief Complaint</span><span className="font-bold text-[#1A237E]">{pcr.incidentInfo?.chiefComplaints || "N/A"}</span></div>
                          </div>
                        </div>

                        {/* Initial Assessment */}
                        <div>
                          <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Initial Assessment</h4>
                          <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">LOC Status</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.loc || "Alert"} (GCS: {pcr.gcsPoints || "15"} pts)</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Spinal Injury</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.spinalInjury || "No"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Trachea</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.trachea || "Normal & Stable"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Pulse</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.circulation?.pulse || "Present"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Bleeding</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.circulation?.bleeding || "No"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Airway</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.airway?.status || "Open"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Breathing</span><span className="font-bold text-[#1A237E]">{pcr.initialAssessment?.breathing?.status || "No Dyspnea"} ({pcr.initialAssessment?.breathing?.oxygen || "O2 not required"})</span></div>
                          </div>
                        </div>

                        {/* Vitals logs table */}
                        {pcr.vitalsLogs && pcr.vitalsLogs.length > 0 && (
                          <div>
                            <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Vitals Log</h4>
                            <div className="border border-[#E8EAF6] rounded-3xl overflow-hidden shadow-sm bg-white">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-[#E8EAF6] text-[#1A237E] font-black uppercase tracking-wider text-[9px]">
                                    <th className="py-2.5 px-3">Time</th>
                                    <th className="py-2.5 px-3">BP</th>
                                    <th className="py-2.5 px-3">PR</th>
                                    <th className="py-2.5 px-3">O2 Sat</th>
                                    <th className="py-2.5 px-3">Skin</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pcr.vitalsLogs.map((log: any, idx: number) => (
                                    <tr key={idx} className="border-b border-[#E8EAF6] last:border-0 font-bold text-slate-700">
                                      <td className="py-2.5 px-3">{log.time || "--"}</td>
                                      <td className="py-2.5 px-3">{log.bp || "--"}</td>
                                      <td className="py-2.5 px-3">{log.pr || "--"}</td>
                                      <td className="py-2.5 px-3">{log.o2_sat || "--"}%</td>
                                      <td className="py-2.5 px-3 text-slate-500">{log.skin || "--"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* SAMPLE History */}
                        <div>
                          <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">SAMPLE History</h4>
                          <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Allergies</span><span className="font-bold text-[#1A237E]">{pcr.sampleHistory?.allergies || "None"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Medications</span><span className="font-bold text-[#1A237E]">{pcr.sampleHistory?.medications || "None"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Past History</span><span className="font-bold text-[#1A237E]">{pcr.sampleHistory?.pastMedicalHistory || "None"}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 font-medium">Last Intake</span><span className="font-bold text-[#1A237E]">{pcr.sampleHistory?.lastOralIntake || "N/A"}</span></div>
                          </div>
                        </div>

                        {/* Pain Assessment */}
                        {pcr.painAssessment && (
                          <div>
                            <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Pain Assessment</h4>
                            <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Location</span><span className="font-bold text-[#1A237E]">{pcr.painAssessment.location || "N/A"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Onset / Quality</span><span className="font-bold text-[#1A237E]">{pcr.painAssessment.onset || "Gradual"} / {pcr.painAssessment.quality || "Aching"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Severity</span><span className="font-bold text-[#1A237E]">{pcr.painAssessment.severity || "5"} / 10</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Radiation / Time</span><span className="font-bold text-[#1A237E]">{pcr.painAssessment.radiation || "None"} @ {pcr.painAssessment.time || "N/A"}</span></div>
                            </div>
                          </div>
                        )}

                        {/* Narrative Report */}
                        <div>
                          <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Narrative Report</h4>
                          <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white text-xs leading-relaxed text-slate-600 font-medium">
                            {pcr.narrativeReport || "No narrative report details provided."}
                          </div>
                        </div>

                        {/* Handoff & Team */}
                        {(() => {
                          const isRefused = pcr.liabilityRelease?.refused === true;
                          const isResolvedOnScene = !pcr.dispatchInfo?.hospitalArrTime || pcr.dispatchInfo?.hospitalArrTime === '';
                          const defaultNa = isRefused ? "N/A (Refused Transport)" : (isResolvedOnScene ? "N/A (Resolved on Scene)" : "N/A");
                          return (
                            <div>
                              <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Handoff Details</h4>
                              <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-slate-500 font-medium">PCR Accomplished By</span><span className="font-bold text-[#1A237E]">{pcr.handoffSignatures?.accomplishedBy || "N/A"} (License: {pcr.handoffSignatures?.accomplishedByLicense || "N/A"})</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 font-medium">Receiving Hospital</span><span className="font-bold text-[#1A237E]">{pcr.handoffSignatures?.receivingHospital || defaultNa} (Arrival: {pcr.handoffSignatures?.arrivalTime || defaultNa})</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 font-medium">Receiving Physician</span><span className="font-bold text-[#1A237E]">{pcr.handoffSignatures?.receivingPhysician || defaultNa} (License: {pcr.handoffSignatures?.receivingPhysicianLicense || defaultNa})</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 font-medium">Referred To</span><span className="font-bold text-[#1A237E]">{pcr.handoffSignatures?.referredTo || defaultNa} (License: {pcr.handoffSignatures?.referredToLicense || defaultNa})</span></div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Responding Team */}
                        {pcr.respondingTeam && (
                          <div>
                            <h4 className="text-[#1A237E] font-black text-[11px] mb-2 uppercase tracking-wider">Responding Team</h4>
                            <div className="border border-[#E8EAF6] rounded-3xl p-4 bg-white space-y-2 text-xs">
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Team Leader</span><span className="font-bold text-[#1A237E]">{pcr.respondingTeam.teamLeader || "N/A"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Team Members</span><span className="font-bold text-[#1A237E]">{pcr.respondingTeam.teamMembers || "N/A"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500 font-medium">Ambulance Driver</span><span className="font-bold text-[#1A237E]">{pcr.respondingTeam.driver || "N/A"}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "trip_ticket" && report.driverTripTicket && (
                <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200 text-left">
                  {/* Header card with export */}
                  <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div>
                      <p className="text-amber-800 font-black text-sm">Driver's Trip Ticket</p>
                      <p className="text-slate-500 text-[10px] font-bold">VEHICLE LOGS & FUEL CONTROLS · {report.driverTripTicket.vehiclePlate || "N/A"}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const { exportDriverTripTicketPDF } = await import("@/lib/pdf-export");
                        await exportDriverTripTicketPDF(report.driverTripTicket, report.id);
                      }}
                      className="h-8 px-3 rounded-full bg-amber-700 text-white hover:bg-amber-800 transition-colors text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>

                  {/* Trip Details */}
                  <div>
                    <h4 className="text-amber-800 font-black text-[11px] mb-2 uppercase tracking-wider">Vehicle & Driver Info</h4>
                    <div className="border border-amber-100 rounded-3xl p-4 bg-white space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Driver Name</span><span className="font-bold text-slate-800">{report.driverTripTicket.driverName || "N/A"} {report.driverTripTicket.signatures?.driverPhone ? `(Phone: ${report.driverTripTicket.signatures.driverPhone})` : ""}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Date of Travel</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.date || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Vehicle Plate</span><span className="font-bold text-slate-800">{report.driverTripTicket.vehiclePlate || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Passengers</span><span className="font-bold text-slate-800">{report.driverTripTicket.passengerName || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Places Visited</span><span className="font-bold text-slate-800">{report.driverTripTicket.placesVisited || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Purpose</span><span className="font-bold text-slate-800">{report.driverTripTicket.purpose || "N/A"}</span></div>
                    </div>
                  </div>

                  {/* Trip Logs */}
                  <div>
                    <h4 className="text-amber-800 font-black text-[11px] mb-2 uppercase tracking-wider">Logistics Logs</h4>
                    <div className="border border-amber-100 rounded-3xl p-4 bg-white space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Departure Office</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.departureOffice || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Arrival Scene</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.arrivalScene || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Departure Scene</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.departureScene || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Arrival Office</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.arrivalOffice || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Distance Travelled</span><span className="font-bold text-slate-800">{report.driverTripTicket.tripLog?.distance || "0"} km</span></div>
                    </div>
                  </div>

                  {/* Fuel Controls */}
                  <div>
                    <h4 className="text-amber-800 font-black text-[11px] mb-2 uppercase tracking-wider">Gasoline & Oil Consumed</h4>
                    <div className="border border-amber-100 rounded-3xl p-4 bg-white space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Balance in Tank</span><span className="font-bold text-slate-800">{report.driverTripTicket.gasolineConsumed?.balance || "0"} Liters</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Issued stock</span><span className="font-bold text-slate-800">{report.driverTripTicket.gasolineConsumed?.issued || "0"} Liters</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Fuel Balance</span><span className="font-bold text-slate-800">{report.driverTripTicket.gasolineConsumed?.total || "0"} Liters</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">Trip Deduction</span><span className="font-bold text-slate-800">{report.driverTripTicket.gasolineConsumed?.deduction || "0"} Liters</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-medium">End Balance</span><span className="font-bold text-slate-800">{report.driverTripTicket.gasolineConsumed?.balanceEnd || "0"} Liters</span></div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <h4 className="text-amber-800 font-black text-[11px] mb-2 uppercase tracking-wider">Trip Remarks</h4>
                    <div className="border border-amber-100 rounded-3xl p-4 bg-white text-xs leading-relaxed text-slate-600 font-medium font-medium">
                      {report.driverTripTicket.remarks || "No trip remarks logged."}
                    </div>
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
