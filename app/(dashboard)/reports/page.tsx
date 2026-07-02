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
  const [category, setCategory] = React.useState<"user" | "responder">("responder");
  const [data, setData] = React.useState<ReportEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<ReportFilter>({});
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = React.useState(false);

  const handleFilterChange = React.useCallback((newFilters: ReportFilter | ((prev: ReportFilter) => ReportFilter)) => {
    setFilters((prev) => {
      const resolved = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      // Preserve the status from activeTab
      return {
        ...resolved,
        status: activeTab === "all" ? undefined : activeTab as any,
      };
    });
    // Reset selection when filters change to avoid index mismatches
    setRowSelection({});
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      status: tab === "all" ? undefined : tab as any
    }));
    setRowSelection({});
  };

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", category);
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
  }, [filters, category]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleViewDetails = (id: string) => {
    setSelectedReportId(id);
    setIsDetailOpen(true);
  };

  const handleExportPDF = async () => {
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

    setIsExporting(true);
    await toast.promise(
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
    setIsExporting(false);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Reports Management</h2>
          <p className="text-slate-500 font-medium text-sm">
            {category === "responder"
              ? "Review and audit historical post-incident reports from ambulance responders."
              : "Review and audit historical emergency/incident reports submitted by residents."}
          </p>
        </div>
        <div className="flex bg-slate-200/80 rounded-full p-1 border border-slate-300/50 shadow-sm shrink-0">
          <button
            onClick={() => {
              setCategory("responder");
              setActiveTab("all");
              setFilters({});
              setRowSelection({});
            }}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300",
              category === "responder"
                ? "bg-[#1E3A8A] text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-300/30"
            )}
          >
            Responder Submitted Reports
          </button>
          <button
            onClick={() => {
              setCategory("user");
              setActiveTab("all");
              setFilters({});
              setRowSelection({});
            }}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300",
              category === "user"
                ? "bg-[#1E3A8A] text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-300/30"
            )}
          >
            User Submitted Reports
          </button>
        </div>
      </div>

      <Card className="rounded-xl shadow-xl border-none overflow-hidden bg-white">
        <ReportsHeader onFilterChange={handleFilterChange} onExport={handleExportPDF} isExporting={isExporting} category={category} />
        
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex overflow-x-auto no-scrollbar bg-slate-100/80 rounded-xl p-1 gap-1">
            {(category === "responder"
              ? (["all", "RESPONDING", "ONGOING", "COMPLETED"] as const)
              : (["all", "PENDING", "VERIFIED", "REJECTED", "DUPLICATE"] as const)
            ).map((tab) => {
              const isActive = activeTab === tab;
              const getBgColor = (t: string) => {
                if (t === "RESPONDING" || t === "VERIFIED") return "bg-[#10B981]";
                if (t === "ONGOING" || t === "PENDING") return "bg-[#F59E0B]";
                if (t === "REJECTED") return "bg-[#EF4444]";
                if (t === "DUPLICATE") return "bg-slate-500";
                return "bg-[#1E3A8A]";
              };
              
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap shrink-0",
                    isActive 
                      ? `${getBgColor(tab)} text-white shadow-sm` 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  {tab === "all" ? (category === "responder" ? "All Responder Submitted" : "All User Submitted") : tab}
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
            category={category}
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
