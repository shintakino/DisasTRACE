"use client";

import * as React from "react";
import { AuditHeader } from "@/components/audit/audit-header";
import { AuditTable } from "@/components/audit/audit-table";
import { AuditLogEntry, AuditFilter } from "@/types/audit";
import { WebPreloader } from "@/components/ui/web-preloader";

export default function AuditPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<AuditFilter>({});

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append("query", filters.search);
      if (filters.userId) queryParams.append("role", filters.userId);
      
      const response = await fetch(`/api/audit?${queryParams.toString()}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0B132B]">
        <WebPreloader title="Loading Audit Trails..." subtitle="Synchronizing security logs, access tokens, and accountability records" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight uppercase">Security Audit Trail</h1>
        <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">CDRRMO System Integrity & Accountability</p>
      </div>

      <div className="flex flex-col shadow-2xl shadow-blue-900/10 rounded-xl overflow-hidden border border-slate-200">
        <AuditHeader onFilterChange={setFilters} />
        
        <AuditTable data={logs} />
      </div>
    </div>
  );
}
