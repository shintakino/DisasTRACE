"use client";

import * as React from "react";
import { ReportsHeader } from "@/components/reports/reports-header";
import { ReportsTable } from "@/components/reports/reports-table";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";
import { ReportEntry, ReportFilter, ReportStatus } from "@/types/reports";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const [data, setData] = React.useState<ReportEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<ReportFilter>({});
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | ReportStatus>("all");
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const handleFilterChange = React.useCallback((newFilters: ReportFilter | ((prev: ReportFilter) => ReportFilter)) => {
    setFilters((prev) => {
      const resolved = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      // Preserve the status from activeTab
      return {
        ...resolved,
        status: activeTab === "all" ? undefined : activeTab,
      };
    });
    // Reset selection when filters change to avoid index mismatches
    setRowSelection({});
  }, [activeTab]);

  const handleTabChange = (tab: "all" | ReportStatus) => {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      status: tab === "all" ? undefined : tab
    }));
    setRowSelection({});
  };

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
    const selectedIndices = Object.keys(rowSelection).filter(key => rowSelection[key]);
    const reportsToExport = selectedIndices.length > 0
      ? selectedIndices.map(idx => data[parseInt(idx)]).filter(Boolean)
      : data;

    if (reportsToExport.length === 0) {
      toast.error("No reports available to export.");
      return;
    }

    const exportingMsg = selectedIndices.length > 0
      ? `Generating PDF summary for ${reportsToExport.length} selected report(s)...`
      : `Generating PDF summary for all ${reportsToExport.length} report(s)...`;

    toast.promise(
      (async () => {
        const { exportReportsSummaryPDF } = await import("@/lib/pdf-export");
        await exportReportsSummaryPDF(reportsToExport, {
          search: filters.search,
          type: filters.type,
          status: filters.status,
        });
      })(),
      {
        loading: exportingMsg,
        success: "PDF exported successfully.",
        error: "Failed to generate PDF. Please try again.",
      }
    );
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

      <Card className="rounded-xl shadow-xl border-none overflow-hidden bg-white">
        <ReportsHeader onFilterChange={handleFilterChange} onExport={handleExportPDF} />
        
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex bg-slate-100/80 rounded-xl p-1 gap-1">
            {(["all", "RESPONDING", "ONGOING", "COMPLETED"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const getBgColor = (t: string) => {
                if (t === "RESPONDING") return "bg-[#10B981]";
                if (t === "ONGOING") return "bg-[#F59E0B]";
                return "bg-[#1E3A8A]";
              };
              
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200",
                    isActive 
                      ? `${getBgColor(tab)} text-white shadow-sm` 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  {tab === "all" ? "All Reports" : tab}
                </button>
              );
            })}
          </div>
        </div>

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
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
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
