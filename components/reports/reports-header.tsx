"use client";

import * as React from "react";
import { Search, Filter, FileDown, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IncidentType, ReportFilter } from "@/types/reports";
import { cn } from "@/lib/utils";

interface ReportsHeaderProps {
  onFilterChange: (filters: ReportFilter | ((prev: ReportFilter) => ReportFilter)) => void;
  onExport: () => void;
  isExporting?: boolean;
  category?: "user" | "responder";
}

export function ReportsHeader({ onFilterChange, onExport, isExporting, category = "responder" }: ReportsHeaderProps) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<IncidentType | "all">("all");

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onFilterChange((prev: ReportFilter) => ({
      ...prev,
      search: val || undefined,
      type: type === "all" ? undefined : type,
    }));
  };

  const handleTypeChange = (val: string | null) => {
    const newType = (val || "all") as IncidentType | "all";
    setType(newType);
    onFilterChange((prev: ReportFilter) => ({
      ...prev,
      search: search || undefined,
      type: newType === "all" ? undefined : newType,
    }));
  };

  return (
    <div className="bg-[#1E3A8A] p-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1 text-left">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {category === "user" ? "USER REPORTS" : "RESPONDER REPORTS"}
        </h2>
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
          {category === "user" ? "Citizen Reported Incidents" : "Historical Incident Data"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10 w-[240px] bg-white/10 border-blue-400/30 text-white placeholder:text-blue-300 focus:bg-white/20 transition-all"
          />
        </div>

        <Popover>
          <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 bg-white/10 border-blue-400/30 text-white hover:bg-white/20 hover:text-white gap-2")}>
            <Filter className="h-4 w-4 text-blue-300" />
            Filter
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Incident Type</label>
                <Select value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Fire Emergency">Fire Emergency</SelectItem>
                    <SelectItem value="Vehicular Collision">Vehicular Collision</SelectItem>
                    <SelectItem value="Medical Emergency">Medical Emergency</SelectItem>
                    <SelectItem value="Structural Failure">Structural Failure</SelectItem>
                    <SelectItem value="Flood/Water">Flood/Water</SelectItem>
                    <SelectItem value="Unknown Cause">Unknown Cause</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={onExport} disabled={isExporting} className="h-10 bg-white text-[#1E3A8A] hover:bg-blue-50 font-bold gap-2 shadow-sm disabled:opacity-50">
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isExporting ? "EXPORTING..." : "EXPORT PDF"}
        </Button>
      </div>
    </div>
  );
}
