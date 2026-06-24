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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole, UserStatus, UserFilter } from "@/types/users";
import { cn } from "@/lib/utils";

interface UsersHeaderProps {
  onFilterChange: (filters: UserFilter) => void;
  onExport: () => void;
  onCreateAccount?: (role: UserRole) => void;
  isExporting?: boolean;
}

export function UsersHeader({ onFilterChange, onExport, onCreateAccount, isExporting }: UsersHeaderProps) {
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<UserRole | "all">("all");
  const [status, setStatus] = React.useState<UserStatus | "all">("all");

  const handleSearchChange = (val: string) => {
    setSearch(val);
    onFilterChange({
      search: val || undefined,
      role: role === "all" ? undefined : role,
      status: status === "all" ? undefined : status,
    });
  };

  const handleRoleChange = (val: string | null) => {
    const newRole = (val || "all") as UserRole | "all";
    setRole(newRole);
    onFilterChange({
      search: search || undefined,
      role: newRole === "all" ? undefined : newRole,
      status: status === "all" ? undefined : status,
    });
  };

  const handleStatusChange = (val: string | null) => {
    const newStatus = (val || "all") as UserStatus | "all";
    setStatus(newStatus);
    onFilterChange({
      search: search || undefined,
      role: role === "all" ? undefined : role,
      status: newStatus === "all" ? undefined : newStatus,
    });
  };

  return (
    <div className="bg-[#1E3A8A] p-6 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-white tracking-tight">USER ACCOUNTS</h2>
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">System Access Management</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
          <Input
            placeholder="Search users..."
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="public_user">Public User</SelectItem>
                    <SelectItem value="ambulance_responder">Responder</SelectItem>
                    <SelectItem value="pacc_admin">PACC Admin</SelectItem>
                    <SelectItem value="cdrrmo_super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
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
        
        {onCreateAccount && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm border border-blue-500">
                CREATE ACCOUNT
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onCreateAccount("cdrrmo_super_admin")} className="font-medium cursor-pointer">
                CDRRMO Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateAccount("pacc_admin")} className="font-medium cursor-pointer">
                PACC Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
