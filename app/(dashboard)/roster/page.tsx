"use client"

import * as React from "react"
import { RosterTable } from "@/components/roster/roster-table"
import { RosterSearch } from "@/components/roster/roster-search"
import { RosterFilter } from "@/components/roster/roster-filter"
import { RosterEntry, RosterFilter as RosterFilterType } from "@/types/roster"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function RosterPage() {
  const [data, setData] = React.useState<RosterEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filters, setFilters] = React.useState<RosterFilterType>({})

  React.useEffect(() => {
    async function fetchRosterData() {
      try {
        const response = await fetch('/api/roster')
        const json = await response.json()

        if (response.ok) {
          setData(json.data)
        } else {
          setError(json.message || "Failed to fetch roster data")
        }
      } catch (err) {
        console.error("Failed to fetch roster data:", err)
        setError("A network error occurred while loading roster data.")
      } finally {
        setLoading(false)
      }
    }

    fetchRosterData()
  }, [])

  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.fullName.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query)
      )
    }

    // Apply Filters
    if (filters.department) {
      result = result.filter((item) => item.department === filters.department)
    }

    if (filters.status) {
      result = result.filter((item) => item.status === filters.status)
    }

    return result
  }, [searchQuery, filters, data])

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-12 w-80 rounded-2xl" />
          <Skeleton className="h-12 w-32 rounded-2xl" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-3xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-2xl">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Roster Error</AlertTitle>
        <AlertDescription className="text-base mt-2">
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <RosterSearch onSearch={setSearchQuery} />
        <RosterFilter onFilterChange={setFilters} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <RosterTable data={filteredData} />
      </div>
    </div>
  )
}
