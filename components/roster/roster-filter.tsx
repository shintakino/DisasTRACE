"use client"

import * as React from "react"
import { Filter, Calendar as CalendarIcon, ChevronDown } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import { RosterFilter as RosterFilterType, RosterStatus } from "@/types/roster"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface RosterFilterProps {
  onFilterChange: (filters: RosterFilterType) => void
}

export function RosterFilter({ onFilterChange }: RosterFilterProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [department, setDepartment] = React.useState<string>("all")
  const [status, setStatus] = React.useState<string>("all")

  const handleApply = () => {
    onFilterChange({
      date,
      department: department === "all" ? undefined : department,
      status: status === "all" ? undefined : status as RosterStatus,
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger 
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 bg-white border-none shadow-md rounded-2xl px-6 flex items-center gap-3 text-[#1E293B] font-bold hover:bg-[#F8FAFC] transition-all"
          )}
        >
          <Filter className="size-4 text-[#1E3A8A]" />
          <span>Filter</span>
          <ChevronDown className="size-4 text-[#94A3B8]" />
        </PopoverTrigger>
        <PopoverContent className="w-80 p-6 rounded-3xl shadow-2xl border-none bg-white mt-2" align="end">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-11 bg-[#F8FAFC] border-none rounded-xl text-sm font-semibold">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="RESCUE FIVE">RESCUE FIVE</SelectItem>
                  <SelectItem value="PACC">PACC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 bg-[#F8FAFC] border-none rounded-xl text-sm font-semibold">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PRESENT">PRESENT</SelectItem>
                  <SelectItem value="ABSENT">ABSENT</SelectItem>
                  <SelectItem value="ON-LEAVE">ON-LEAVE</SelectItem>
                  <SelectItem value="ON-DUTY">ON-DUTY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Date Selection</label>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full h-11 justify-start text-left font-semibold bg-[#F8FAFC] border-none rounded-xl text-sm",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#1E3A8A]" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              className="w-full h-12 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all mt-2"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
