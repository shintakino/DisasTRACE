"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface RosterSearchProps {
  onSearch: (value: string) => void
}

export function RosterSearch({ onSearch }: RosterSearchProps) {
  return (
    <div className="relative w-full md:w-64 group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue-100" />
      <Input
        placeholder="Search responders..."
        className="h-10 rounded-xl border border-white/20 bg-white/10 pl-9 text-sm font-medium text-white placeholder:text-blue-100 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/40 transition-all"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  )
}
