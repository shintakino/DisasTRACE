"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoveRight, MapPin } from "lucide-react";
import { RecentReport } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "motion/react";
import { format } from "date-fns";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function RecentReports({ 
  reports,
  onReportClick
}: { 
  reports: RecentReport[];
  onReportClick?: (id: string) => void;
}) {
  return (
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-2xl font-bold text-[#1E293B]">Recent Incident Reports</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <ScrollArea className="h-full px-6 pb-6">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {reports.map((report) => (
              <motion.div 
                key={report.id} 
                variants={item}
                onClick={() => onReportClick?.(report.id)}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] flex flex-col gap-1.5 hover:shadow-sm cursor-pointer hover:bg-[#F1F5F9]/80 transition-all duration-200"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-[#64748B] uppercase tracking-tight">{report.vehicleId}</span>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      {format(new Date(report.timestamp), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <span className="text-base font-bold text-[#1E293B] leading-tight">{report.requestId}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin className="size-2.5 text-[#64748B] shrink-0" />
                    <span className="text-[10px] font-semibold text-[#334155] truncate">{report.origin}</span>
                  </div>
                  
                  <MoveRight className="size-2.5 text-[#94A3B8] shrink-0" />
                  
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin className="size-2.5 text-[#64748B] shrink-0" />
                    <span className="text-[10px] font-semibold text-[#334155] truncate">{report.destination}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
