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
  onFilterChange: (filters: RosterFilterType) => void
}

export function RosterFilter({ onFilterChange }: RosterFilterProps) {
  const [status, setStatus] = React.useState<string>("all")

  const handleApply = () => {
    onFilterChange({
      status: status === "all" ? undefined : status as RosterStatus,
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger 
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 bg-white border-none shadow-sm rounded-full px-4 flex items-center gap-2 text-gray-600 font-medium hover:bg-gray-50 transition-all"
          )}
        >
          <Filter className="size-4 text-gray-500" />
          <span>Filter</span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4 rounded-xl shadow-xl border border-gray-100 bg-white mt-2" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Status</label>
              <Select value={status} onValueChange={(val) => setStatus(val || "all")}>
                <SelectTrigger className="h-10 bg-gray-50 border-none rounded-md text-sm font-medium">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-none shadow-md">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="DEACTIVATED">DEACTIVATED</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full h-10 bg-[#2B4C9B] hover:bg-[#2B4C9B]/90 text-white font-medium rounded-md shadow-sm transition-all mt-2"
              onClick={handleApply}
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
