"use client";

import * as React from "react";
import { UserSummaryCards } from "@/components/users/user-summary-cards";
import { UsersHeader } from "@/components/users/users-header";
import { UsersTable } from "@/components/users/users-table";
import { ManageUserDialog, DeleteUserDialog } from "@/components/users/user-action-dialogs";
import { UserManagementEntry, UserFilter, UserStatus, UserRole } from "@/types/users";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<UserManagementEntry[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<UserManagementEntry[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    active: 0,
    suspended: 0,
    deactivated: 0,
  });

  const [selectedUser, setSelectedUser] = React.useState<UserManagementEntry | null>(null);
  const [isManageOpen, setIsManageOpen] = React.useState(false);
  const [deleteUserId, setDeleteUserId] = React.useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filters: UserFilter) => {
    let result = [...users];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
    }

    if (filters.role) {
      result = result.filter((u) => u.role === filters.role);
    }

    if (filters.status) {
      result = result.filter((u) => u.status === filters.status);
    }

    setFilteredUsers(result);
  };

  const handleUpdateUser = async (id: string, updates: { status?: UserStatus; role?: UserRole; reason?: string }) => {
    // In a real app, this would be an API call
    toast.success(`User updated successfully`);
    
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    setFilteredUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    
    // Re-calculate summary
    const newUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setSummary({
      total: newUsers.length,
      active: newUsers.filter(u => u.status === "ACTIVE").length,
      suspended: newUsers.filter(u => u.status === "SUSPENDED").length,
      deactivated: newUsers.filter(u => u.status === "DEACTIVATED").length,
    });
  };

  const handleDeleteUser = async (id: string) => {
    // In a real app, this would be an API call
    toast.success("User deleted successfully");
    
    // Optimistic update
    const newUsers = users.filter(u => u.id !== id);
    setUsers(newUsers);
    setFilteredUsers(newUsers);
    setSummary({
      total: newUsers.length,
      active: newUsers.filter(u => u.status === "ACTIVE").length,
      suspended: newUsers.filter(u => u.status === "SUSPENDED").length,
      deactivated: newUsers.filter(u => u.status === "DEACTIVATED").length,
    });
  };

  const handleExport = () => {
    toast.info("Exporting user list to PDF...");
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">USER MANAGEMENT</h1>
        <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">Administrative Control Center</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : (
        <UserSummaryCards data={summary} />
      )}

      <div className="space-y-0">
        <UsersHeader onFilterChange={handleFilterChange} onExport={handleExport} />
        {loading ? (
          <div className="bg-white border-x border-b p-8 rounded-b-xl">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <UsersTable
            data={filteredUsers}
            onManageStatus={(user) => {
              setSelectedUser(user);
              setIsManageOpen(true);
            }}
            onDelete={(id) => setDeleteUserId(id)}
          />
        )}
      </div>

      <ManageUserDialog
        user={selectedUser}
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onUpdate={handleUpdateUser}
      />

      <DeleteUserDialog
        userId={deleteUserId}
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
