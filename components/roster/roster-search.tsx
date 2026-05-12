"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface RosterSearchProps {
  onSearch: (value: string) => void
}

export function RosterSearch({ onSearch }: RosterSearchProps) {
  return (
    <div className="relative w-full md:w-80 group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#64748B] group-focus-within:text-[#1E3A8A] transition-colors" />
      <Input
        placeholder="Search for responders or department..."
        className="pl-11 h-12 bg-white border-none shadow-md rounded-2xl text-sm font-medium placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/20 transition-all"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  )
}
