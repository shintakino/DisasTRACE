"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"
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
import { LogStatus } from "@/types/logs"

interface LogsHeaderProps {
  onSearch: (value: string) => void
  onStatusFilter: (status: LogStatus | "ALL") => void
}

export function LogsHeader({ onSearch, onStatusFilter }: LogsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Responder Status & Logs</h1>
        <p className="text-sm text-[#64748B] font-medium">Real-time update stream of all emergency activities.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
          <Input 
            placeholder="Search reports..." 
            className="pl-10 bg-white border-[#E2E8F0] text-[#1E293B] placeholder:text-[#94A3B8] rounded-xl focus-visible:ring-[#1E3A8A]"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 border-[#E2E8F0] text-[#1E293B] font-semibold rounded-xl hover:bg-[#F1F5F9]">
              <Filter className="size-4" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 rounded-2xl shadow-2xl border-[#E2E8F0]" align="end">
            <div className="space-y-4">
              <h4 className="font-bold text-[#1E293B]">Filter Logs</h4>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Status Type</label>
                <Select onValueChange={(value) => onStatusFilter(value as LogStatus | "ALL")}>
                  <SelectTrigger className="rounded-xl border-[#E2E8F0]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="STANDBY">Standby</SelectItem>
                    <SelectItem value="ON-SCENE">On-Scene</SelectItem>
                    <SelectItem value="OFF-DUTY">Off-Duty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
