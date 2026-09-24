"use client";

import * as React from "react";
import { Search, Filter } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
import { AuditFilter } from "@/types/audit";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface AuditHeaderProps {
  onFilterChange: (filters: AuditFilter) => void;
}

export function AuditHeader({ onFilterChange }: AuditHeaderProps) {
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<string>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const lastPublishedSearch = React.useRef(search);

  const publishFilters = (next: { search?: string; role?: string; from?: string; to?: string }) => {
    const start = next.from ?? from;
    const end = next.to ?? to;
    onFilterChange({
      search: (next.search ?? search) || undefined,
      role: (next.role ?? role) === "all" ? undefined : (next.role ?? role),
      dateRange: start || end ? {
        from: start ? new Date(`${start}T00:00:00`) : undefined,
        to: end ? new Date(`${end}T23:59:59.999`) : undefined,
      } : undefined,
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  React.useEffect(() => {
    if (debouncedSearch === lastPublishedSearch.current) return;
    lastPublishedSearch.current = debouncedSearch;
    publishFilters({ search: debouncedSearch });
  }, [debouncedSearch]);

  const handleRoleChange = (val: string | null) => {
    const value = val || "all";
    setRole(value);
    publishFilters({ role: value });
  };

  return (
    <div className="bg-[#1E3A8A] p-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h2>
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">System Activity & Security Oversight</p>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">User Role</label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="cdrrmo_super_admin">Super Admin</SelectItem>
                    <SelectItem value="pacc_admin">PACC Admin</SelectItem>
                    <SelectItem value="ambulance_responder">Responder</SelectItem>
                    <SelectItem value="public_user">Public User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div className="space-y-2">
                  <label htmlFor="audit-from" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From</label>
                  <Input id="audit-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); publishFilters({ from: event.target.value }); }} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="audit-to" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">To</label>
                  <Input id="audit-to" type="date" min={from || undefined} value={to} onChange={(event) => { setTo(event.target.value); publishFilters({ to: event.target.value }); }} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
