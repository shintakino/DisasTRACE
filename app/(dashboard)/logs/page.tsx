"use client"

import * as React from "react"
import { LogsHeader } from "@/components/logs/logs-header"
import { LogsTable } from "@/components/logs/logs-table"
import { StatusLogEntry, LogStatus } from "@/types/logs"
import { Skeleton } from "@/components/ui/skeleton"

export default function LogsPage() {
  const [logs, setLogs] = React.useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<LogStatus | "ALL">("ALL")

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (search) queryParams.append("search", search)
      if (statusFilter !== "ALL") queryParams.append("status", statusFilter)

      const response = await fetch(`/api/logs?${queryParams.toString()}`)
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  React.useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="flex flex-col gap-6 p-6">
      <LogsHeader 
        onSearch={setSearch} 
        onStatusFilter={setStatusFilter} 
      />
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[600px] w-full rounded-3xl" />
        </div>
      ) : (
        <LogsTable data={logs} />
      )}
    </div>
  )
}
