"use client";

import * as React from "react";
import { Search, RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IncidentType, ReportStatus, ReportFilter } from "@/types/reports";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilter) => void;
}

export function ReportFilters({ onFilterChange }: ReportFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<IncidentType | "all">("all");
  const [status, setStatus] = React.useState<ReportStatus | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<Date>();
  const [dateTo, setDateTo] = React.useState<Date>();

  const handleReset = () => {
    setSearch("");
    setType("all");
    setStatus("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    onFilterChange({});
  };

  const handleApply = () => {
    onFilterChange({
      search: search || undefined,
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      dateFrom,
      dateTo,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-card rounded-lg border shadow-sm">
      <div className="flex-1 min-w-[240px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Case ID or Vehicle ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <div className="w-[180px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Incident Type
        </label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as IncidentType | "all")}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Vehicular Collision">Vehicular Collision</SelectItem>
            <SelectItem value="Medical Emergency">Medical Emergency</SelectItem>
            <SelectItem value="Structural Failure">Structural Failure</SelectItem>
            <SelectItem value="Fire/Explosion">Fire/Explosion</SelectItem>
            <SelectItem value="Flood/Water">Flood/Water</SelectItem>
            <SelectItem value="Unknown Cause">Unknown Cause</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[180px]">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Status
        </label>
        <Select
          value={status}
          onValueChange={(val) => setStatus(val as ReportStatus | "all")}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="STANDBY">Standby</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Date From
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] h-10 justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PP") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Date To
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] h-10 justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PP") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        <Button
          variant="ghost"
          onClick={handleReset}
          className="h-10 text-muted-foreground"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleApply} className="h-10 bg-primary text-primary-foreground">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
