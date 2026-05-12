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

interface AuditHeaderProps {
  onFilterChange: (filters: AuditFilter) => void;
}

export function AuditHeader({ onFilterChange }: AuditHeaderProps) {
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<string>("all");

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onFilterChange({
      search: val || undefined,
      userId: role === "all" ? undefined : role, // Reusing role as a filter for now
    });
  };

  const handleRoleChange = (val: string) => {
    setRole(val);
    onFilterChange({
      search: search || undefined,
      userId: val === "all" ? undefined : val,
    });
  };

  return (
    <div className="bg-[#1E3A8A] p-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">Audit Logs</h2>
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">System Activity & Security Oversight</p>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">User Role</label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="pacc">PACC</SelectItem>
                    <SelectItem value="responder">Responder</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
