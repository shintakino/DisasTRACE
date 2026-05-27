"use client";

import * as React from "react";
import { UserSummaryCards } from "@/components/users/user-summary-cards";
import { UsersHeader } from "@/components/users/users-header";
import { UsersTable } from "@/components/users/users-table";
import { BanUserDialog, DeleteUserDialog, CreateUserDialog, ManageUserDialog } from "@/components/users/user-action-dialogs";
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

  const [banUser, setBanUser] = React.useState<UserManagementEntry | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<UserManagementEntry | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserManagementEntry | null>(null);
  const [isManageOpen, setIsManageOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createRole, setCreateRole] = React.useState<UserRole | undefined>(undefined);

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
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: updates.status,
          role: updates.role,
          rejectionReason: updates.reason
        }),
      });

      if (response.ok) {
        toast.success(`User updated successfully`);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to update user");
      }
    } catch (err) {
      console.error("Failed to update user:", err);
      toast.error("Failed to update user");
    }
  };

  const handleBanUser = async (id: string, reason: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "SUSPENDED",
          rejectionReason: reason
        }),
      });

      if (response.ok) {
        toast.success(`User banned successfully`);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to ban user");
      }
    } catch (err) {
      console.error("Failed to ban user:", err);
      toast.error("Failed to ban user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error("Failed to delete user");
    }
  };

  const handleExport = () => {
    toast.info("Exporting user list to PDF...");
  };

  const handleCreateUser = async (newUser: { fullName: string; email: string; role: UserRole; password?: string }) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          password: newUser.password || "DisasTRACE_Default_2026!",
        }),
      });

      if (response.ok) {
        toast.success(`Account for ${newUser.fullName} created successfully`);
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to create user account");
      }
    } catch (err) {
      console.error("Failed to create user:", err);
      toast.error("Failed to create user account");
    }
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
        <UsersHeader 
          onFilterChange={handleFilterChange} 
          onExport={handleExport}
          onCreateAccount={(role) => {
            setCreateRole(role);
            setIsCreateOpen(true);
          }}
        />
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
            onBan={(user) => {
              setBanUser(user);
            }}
            onDelete={(user) => setDeleteUser(user)}
          />
        )}
      </div>

      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultRole={createRole}
        onCreate={handleCreateUser}
      />

      <ManageUserDialog
        user={selectedUser}
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onUpdate={handleUpdateUser}
      />

      <BanUserDialog
        user={banUser}
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
        onConfirm={handleBanUser}
      />

      <DeleteUserDialog
        user={deleteUser}
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
