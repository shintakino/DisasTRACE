"use client";

import * as React from "react";
import { format } from "date-fns";
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
  ChevronRight,
} from "lucide-react";
import Image from "next/image";

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
      <SheetContent className="sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-primary border-primary">
              {report?.id || "Loading..."}
            </Badge>
            {report && (
              <Badge
                className={
                  report.status === "COMPLETED"
                    ? "bg-green-500"
                    : report.status === "ONGOING"
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }
              >
                {report.status}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-2xl font-bold">{report?.type || "Incident Report"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" />
            {report?.timestamp ? format(new Date(report.timestamp), "PPPP p") : "Loading date..."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <span>Fetching incident details...</span>
            </div>
          ) : report ? (
            <div className="p-6 space-y-8">
              {/* Scene Overview */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Incident Overview</h3>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground mb-1 uppercase text-[10px] font-bold tracking-wider">Responder</p>
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-3 w-3" /> {report.responderName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 uppercase text-[10px] font-bold tracking-wider">Vehicle</p>
                      <p className="font-medium">{report.vehicleId}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {report.description || "No description provided."}
                  </p>
                </div>
              </section>

              {/* Location Timeline */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Location Details</h3>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Origin</p>
                      <p className="text-sm font-medium">{report.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-3 w-3 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Destination</p>
                      <p className="text-sm font-medium">{report.destination}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Scene Photos */}
              {report.scenePhotos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Scene Photos</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {report.scenePhotos.map((photo, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                        <img
                          src={photo}
                          alt={`Scene photo ${i + 1}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Logs / Timeline */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Activity Logs</h3>
                </div>
                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                  {report.logs.map((log, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className="h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 z-10">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.time), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Participants */}
              {report.participants && report.participants.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Involved Parties</h3>
                  </div>
                  <div className="space-y-3">
                    {report.participants.map((person, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{person.name}</p>
                            <p className="text-xs text-muted-foreground">{person.contact}</p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold",
                            person.triageStatus === "Red" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            person.triageStatus === "Yellow" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                            person.triageStatus === "Green" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}
                        >
                          {person.triageStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              Select an incident to view details.
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
