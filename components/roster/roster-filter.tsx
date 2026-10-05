"use client"

import * as React from "react"
import { Filter } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RosterFilter as RosterFilterType, RosterStatus } from "@/types/roster"
import { cn } from "@/lib/utils"

interface RosterFilterProps {
  filters: RosterFilterType
  onFilterChange: (filters: RosterFilterType) => void
}

export function RosterFilter({ filters, onFilterChange }: RosterFilterProps) {
  const [status, setStatus] = React.useState<string>(filters.status ?? "all")
  const appliedStatusLabel = filters.status
    ? `${filters.status.charAt(0)}${filters.status.slice(1).toLowerCase()}`
    : null

  React.useEffect(() => {
    setStatus(filters.status ?? "all")
  }, [filters.status])

  const handleApply = () => {
    onFilterChange({
      status: status === "all" ? undefined : status as RosterStatus,
    })
  }

  const handleClear = () => {
    setStatus("all")
    onFilterChange({})
  }

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger 
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 rounded-xl border border-white/20 bg-white/10 px-4 flex items-center gap-2 text-white font-medium hover:bg-white/20 transition-all"
          )}
        >
          <Filter className="size-4 text-blue-100" />
          <span>{appliedStatusLabel ? `Filter: ${appliedStatusLabel}` : 'Filter'}</span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 rounded-xl shadow-xl border border-gray-100 bg-white mt-2" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Status</label>
              <Select value={status} onValueChange={(val) => setStatus(val || "all")}>
                <SelectTrigger className="h-10 bg-gray-50 border-none rounded-md text-sm font-medium">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-none shadow-md">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              {filters.status ? <Button type="button" variant="outline" className="h-10 flex-1" onClick={handleClear}>Clear</Button> : null}
              <Button
                className="h-10 flex-1 bg-[#2B4C9B] hover:bg-[#2B4C9B]/90 text-white font-medium rounded-md shadow-sm transition-all"
                onClick={handleApply}
              >
                Apply Filter
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
