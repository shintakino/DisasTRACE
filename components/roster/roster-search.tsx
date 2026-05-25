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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
      <Input
        placeholder="Search reports..."
        className="pl-9 h-10 bg-white border-none rounded-full text-sm font-medium text-gray-900 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white/20 transition-all shadow-sm"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  )
}
