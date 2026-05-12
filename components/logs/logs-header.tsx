"use client";

import * as React from "react";
import { Search, Filter, RotateCcw } from "lucide-react";
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
import { LogStatus, LogFilter } from "@/types/logs";
import { cn } from "@/lib/utils";

interface LogsHeaderProps {
  onFilterChange: (filters: LogFilter) => void;
}

export function LogsHeader({ onFilterChange }: LogsHeaderProps) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<LogStatus | "all">("all");

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onFilterChange({
      search: val || undefined,
      status: status === "all" ? undefined : status,
    });
  };

  const handleStatusChange = (val: string) => {
    const newStatus = val as LogStatus | "all";
    setStatus(newStatus);
    onFilterChange({
      search: search || undefined,
      status: newStatus === "all" ? undefined : newStatus,
    });
  };

  return (
    <div className="bg-[#1E3A8A] p-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">RESPONDER STATUS & LOGS</h2>
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Real-time Activity Audit Trail</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
          <Input
            placeholder="Search logs..."
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Type</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
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

        <Button 
          variant="ghost" 
          onClick={() => {
            setSearch("");
            setStatus("all");
            onFilterChange({});
          }}
          className="h-10 text-blue-200 hover:text-white hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
