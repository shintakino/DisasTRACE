"use client";

import * as React from "react";
import { UserSummaryCards } from "@/components/users/user-summary-cards";
import { UsersHeader } from "@/components/users/users-header";
import { UsersTable } from "@/components/users/users-table";
import { BanUserDialog, CreateUserDialog, ManageUserDialog } from "@/components/users/user-action-dialogs";
import { UserManagementEntry, UserFilter, UserStatus, UserRole } from "@/types/users";
import { toast } from "sonner";
import { WebPreloader } from "@/components/ui/web-preloader";
import { CommandPageHeading } from "@/components/dashboard/command-page-heading";

export default function UsersPage() {
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<UserManagementEntry[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<UserManagementEntry[]>([]);
  const [currentFilters, setCurrentFilters] = React.useState<UserFilter>({});
  const [summary, setSummary] = React.useState({
    total: 0,
    active: 0,
    suspended: 0,
    deactivated: 0,
  });

  const [banUser, setBanUser] = React.useState<UserManagementEntry | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserManagementEntry | null>(null);
  const [isManageOpen, setIsManageOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createRole, setCreateRole] = React.useState<UserRole | undefined>(undefined);
  const [isExporting, setIsExporting] = React.useState(false);

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
    setCurrentFilters(filters);
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

  const handleReleaseDevice = async (user: UserManagementEntry) => {
    if (!window.confirm(`Release ${user.fullName}'s mobile device? Their current mobile app will lose access, and they can sign in on a replacement device.`)) return;
    try {
      const response = await fetch(`/api/users/${user.id}/mobile-device`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to release mobile device.');
      toast.success(result.message || 'Mobile device released.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to release mobile device.');
    }
  };



  const handleExport = async () => {
    if (filteredUsers.length === 0) {
      toast.error("No users available to export.");
      return;
    }

    setIsExporting(true);
    await toast.promise(
      (async () => {
        const { exportUsersListPDF } = await import("@/lib/pdf-export");
        await exportUsersListPDF(filteredUsers, {
          search: currentFilters.search,
          role: currentFilters.role,
          status: currentFilters.status,
        });
      })(),
      {
        loading: "Generating PDF summary of user registry...",
        success: "User registry PDF generated and downloaded.",
        error: "Failed to generate PDF. Please try again.",
      }
    );
    setIsExporting(false);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0B132B]">
        <WebPreloader title="Loading User Registries..." subtitle="Synchronizing resident profiles and administrator access controls" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
      <CommandPageHeading
        eyebrow="Administrative control center"
        title="User management"
        description="Manage user access, verification status, and administrative roles."
      />

      <UserSummaryCards data={summary} />

      <div className="space-y-0">
        <UsersHeader 
          onFilterChange={handleFilterChange} 
          onExport={handleExport}
          onCreateAccount={(role) => {
            setCreateRole(role);
            setIsCreateOpen(true);
          }}
          isExporting={isExporting}
        />
        <UsersTable
          data={filteredUsers}
          onManageStatus={(user) => {
            setSelectedUser(user);
            setIsManageOpen(true);
          }}
          onBan={(user) => {
            setBanUser(user);
          }}
          onReleaseDevice={handleReleaseDevice}
        />
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
    </div>
  );
}
