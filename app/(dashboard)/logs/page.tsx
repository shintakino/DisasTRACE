"use client"

import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { LogsHeader } from "@/components/logs/logs-header"
import { LogsTable } from "@/components/logs/logs-table"
import { StatusLogEntry, LogFilter } from "@/types/logs"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { createClientBrowser } from "@/lib/supabase"

export default function LogsPage() {
  const { role } = useAuth()
  const isPaccAdmin = role === "pacc_admin"

  const [logs, setLogs] = React.useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [filters, setFilters] = React.useState<LogFilter>({})

  const fetchLogs = React.useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters.search) queryParams.append("search", filters.search)
      if (filters.status) queryParams.append("status", filters.status)

      const response = await fetch(`/api/logs?${queryParams.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch logs")
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error("Error loading activity logs")
    } finally {
      if (showSkeleton) setIsLoading(false)
    }
  }, [filters])

  React.useEffect(() => {
    if (role) {
      fetchLogs(true)
    }
  }, [fetchLogs, role])

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
          // Silent refresh (avoid skeleton flicker)
          fetchLogs(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLogs, role])

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Status & Activity Logs</h2>
          <p className="text-slate-500 font-medium text-sm">
            Monitor real-time responder status transitions and event history.
          </p>
        </div>
      </div>

      <Card className="rounded-xl shadow-xl border-none overflow-hidden">
        <LogsHeader onFilterChange={setFilters} />
        
        {isLoading ? (
          <div className="p-8 space-y-4 bg-white">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <LogsTable data={logs} />
        )}
      </Card>
    </div>
  )
}
