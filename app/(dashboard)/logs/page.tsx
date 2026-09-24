"use client"

import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { LogsHeader } from "@/components/logs/logs-header"
import { LogsTable } from "@/components/logs/logs-table"
import { StatusLogEntry, LogFilter } from "@/types/logs"
import { Card } from "@/components/ui/card"
import { WebPreloader } from "@/components/ui/web-preloader"
import { toast } from "sonner"
import { createClientBrowser } from "@/lib/supabase"
import { CommandPageHeading } from "@/components/dashboard/command-page-heading"

export default function LogsPage() {
  const { role } = useAuth()
  const isPaccAdmin = role === "pacc_admin"

  const [logs, setLogs] = React.useState<StatusLogEntry[]>([])
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [filters, setFilters] = React.useState<LogFilter>({})
  const hasLoadedRef = React.useRef(false)
  const latestRequestRef = React.useRef(0)

  const fetchLogs = React.useCallback(async (showSkeleton = true) => {
    const requestId = ++latestRequestRef.current
    const isInitialLoad = !hasLoadedRef.current
    if (showSkeleton && isInitialLoad) {
      setIsInitialLoading(true)
    } else if (showSkeleton) {
      setIsRefreshing(true)
    }

    try {
      const queryParams = new URLSearchParams()
      if (filters.search) queryParams.append("search", filters.search)
      if (filters.status) queryParams.append("status", filters.status)
      if (filters.dateRange?.from) queryParams.append("from", filters.dateRange.from.toISOString())
      if (filters.dateRange?.to) queryParams.append("to", filters.dateRange.to.toISOString())
      queryParams.append("_t", Date.now().toString()) // Bypass browser cache

      const response = await fetch(`/api/logs?${queryParams.toString()}`, {
        cache: "no-store",
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        }
      })
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error("Invalid logs response")
      if (requestId === latestRequestRef.current) {
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error("Error loading activity logs")
    } finally {
      if (requestId === latestRequestRef.current) {
        hasLoadedRef.current = true
        setIsInitialLoading(false)
        if (showSkeleton) setIsRefreshing(false)
      }
    }
  }, [filters])

  React.useEffect(() => {
    if (role) {
      fetchLogs(true)
    }
  }, [fetchLogs, role])

  // Track the latest fetchLogs function using a ref to prevent recreating channel on every keystroke/filter change
  const fetchLogsRef = React.useRef(fetchLogs)
  React.useEffect(() => {
    fetchLogsRef.current = fetchLogs
  }, [fetchLogs])

  React.useEffect(() => {
    if (!role) return

    const supabase = createClientBrowser()
    
    // Subscribe to realtime status logs changes
    const channel = supabase
      .channel("status_logs_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "status_logs",
        },
        () => {
          // Silent refresh (avoid skeleton flicker) using the latest ref function
          fetchLogsRef.current(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

  if (isInitialLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0B132B]">
        <WebPreloader title="Loading Activity Logs..." subtitle="Streaming status logs, dispatcher activity, and audit records in real-time" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <CommandPageHeading
          title="Status and activity logs"
          description="Monitor real-time responder status transitions and event history."
        />
      </div>

      <div className="flex flex-col rounded-xl shadow-xl border border-slate-200/80 overflow-hidden bg-white">
        <div className="relative">
          <LogsHeader onFilterChange={setFilters} />
          {isRefreshing && (
            <p className="absolute bottom-2 right-6 text-[11px] font-medium text-blue-200" role="status">
              Updating results…
            </p>
          )}
        </div>
        
        <LogsTable data={logs} showActionColumn={role === "cdrrmo_super_admin"} />
      </div>
    </div>
  )
}
