"use client";

import * as React from "react";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportsTable } from "@/components/reports/reports-table";
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet";
import { ReportTableItem, ReportFilter } from "@/types/reports";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const [data, setData] = React.useState<ReportTableItem[]>([]);
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
      // Date filters would be appended here as well in a real app

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

  const handleDownloadPDF = (id: string) => {
    toast.info(`Generating PDF for ${id}...`);
    // Mock download
    setTimeout(() => {
      toast.success(`Report ${id} has been downloaded.`);
    }, 2000);
  };

  const handleBatchExport = () => {
    toast.info("Preparing batch export...");
    setTimeout(() => {
      toast.success("Batch export completed successfully.");
    }, 2500);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Incident Reports</h2>
          <p className="text-muted-foreground">
            Search, filter, and audit historical incident data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBatchExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            New Manual Report
          </Button>
        </div>
      </div>

      <ReportFilters onFilterChange={setFilters} />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : (
        <ReportsTable
          data={data}
          onViewDetails={handleViewDetails}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      <ReportDetailSheet
        reportId={selectedReportId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
