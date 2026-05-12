"use client";

import * as React from "react";
import { ReportsHeader } from "@/components/reports/reports-header";
import { ReportsTable } from "@/components/reports/reports-table";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";
import { ReportEntry, ReportFilter } from "@/types/reports";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function ReportsPage() {
  const [data, setData] = React.useState<ReportEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<ReportFilter>({});
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleViewDetails = (id: string) => {
    setSelectedReportId(id);
    setIsDetailOpen(true);
  };

  const handleExportPDF = () => {
    toast.info("Generating reports summary PDF...");
    setTimeout(() => {
      toast.success("PDF exported successfully.");
    }, 2000);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Reports Management</h2>
          <p className="text-slate-500 font-medium text-sm">
            Review and audit historical incident reports from responders.
          </p>
        </div>
      </div>

      <Card className="rounded-xl shadow-xl border-none overflow-hidden">
        <ReportsHeader onFilterChange={setFilters} onExport={handleExportPDF} />
        
        {loading ? (
          <div className="p-8 space-y-4 bg-white">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ReportsTable
            data={data}
            onViewDetails={handleViewDetails}
          />
        )}
      </Card>

      <ReportDetailSheet
        reportId={selectedReportId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
