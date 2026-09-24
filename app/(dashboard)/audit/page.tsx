"use client";

import * as React from "react";
import { AuditHeader } from "@/components/audit/audit-header";
import { AuditTable } from "@/components/audit/audit-table";
import { AuditLogEntry, AuditFilter } from "@/types/audit";
import { WebPreloader } from "@/components/ui/web-preloader";
import { CommandPageHeading } from "@/components/dashboard/command-page-heading";

export default function AuditPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [filters, setFilters] = React.useState<AuditFilter>({});
  const hasLoadedRef = React.useRef(false);
  const latestRequestRef = React.useRef(0);

  const fetchLogs = React.useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append("query", filters.search);
      if (filters.role) queryParams.append("role", filters.role);
      if (filters.dateRange?.from) queryParams.append("from", filters.dateRange.from.toISOString());
      if (filters.dateRange?.to) queryParams.append("to", filters.dateRange.to.toISOString());
      
      const response = await fetch(`/api/audit?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid audit log response");
      if (requestId === latestRequestRef.current) {
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      if (requestId === latestRequestRef.current) {
        hasLoadedRef.current = true;
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [filters]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (isInitialLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0B132B]">
        <WebPreloader title="Loading Audit Trails..." subtitle="Synchronizing security logs, access tokens, and accountability records" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
      <CommandPageHeading
        eyebrow="CDRRMO system integrity and accountability"
        title="Security audit trail"
        description="Review security-sensitive administrative actions and system events."
      />

      <div className="flex flex-col shadow-2xl shadow-blue-900/10 rounded-xl overflow-hidden border border-slate-200">
        <div className="relative">
          <AuditHeader onFilterChange={setFilters} />
          {isRefreshing && (
            <p className="absolute bottom-2 right-6 text-[11px] font-medium text-blue-200" role="status">
              Updating results…
            </p>
          )}
        </div>
        
        <AuditTable data={logs} />
      </div>
    </div>
  );
}
