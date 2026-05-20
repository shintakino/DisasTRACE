"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserManagementEntry, UserStatus, UserRole } from "@/types/users";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface ManageUserDialogProps {
  user: UserManagementEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: { status?: UserStatus; role?: UserRole; reason?: string }) => void;
}

export function ManageUserDialog({ user, isOpen, onClose, onUpdate }: ManageUserDialogProps) {
  const [status, setStatus] = React.useState<UserStatus>("ACTIVE");
  const [role, setRole] = React.useState<UserRole>("public_user");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setStatus(user.status);
      setRole(user.role);
      setReason("");
    }
  }, [user]);

  const handleUpdate = () => {
    if (!user) return;
    onUpdate(user.id, { status, role, reason });
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold">Manage User</DialogTitle>
          </div>
          <DialogDescription className="font-medium text-slate-500">
            Updating permissions and status for <span className="text-slate-900 font-bold">{user.fullName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role" className="text-xs font-black text-slate-400 uppercase tracking-widest">System Role</Label>
            <Select value={role} onValueChange={(val) => val && setRole(val as UserRole)}>
              <SelectTrigger id="role" className="h-11 font-bold text-slate-700">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public_user" className="font-medium">Public User</SelectItem>
                <SelectItem value="ambulance_responder" className="font-medium">Responder</SelectItem>
                <SelectItem value="pacc_admin" className="font-medium">PACC Admin</SelectItem>
                <SelectItem value="cdrrmo_super_admin" className="font-medium">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status" className="text-xs font-black text-slate-400 uppercase tracking-widest">Account Status</Label>
            <Select value={status} onValueChange={(val) => val && setStatus(val as UserStatus)}>
              <SelectTrigger id="status" className="h-11 font-bold text-slate-700">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="font-medium text-green-600">Active</SelectItem>
                <SelectItem value="SUSPENDED" className="font-medium text-orange-600">Suspended</SelectItem>
                <SelectItem value="DEACTIVATED" className="font-medium text-red-600">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "SUSPENDED" || status === "DEACTIVATED") && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="reason" className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Reason for {status === "SUSPENDED" ? "Suspension" : "Deactivation"}
              </Label>
              <Textarea
                id="reason"
                placeholder="Briefly explain the reason for this action..."
                className="min-h-[100px] resize-none border-slate-200 focus:border-blue-500 font-medium"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
            CANCEL
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-[#1E3A8A] hover:bg-blue-800 text-white font-black px-6"
            disabled={(status === "SUSPENDED" || status === "DEACTIVATED") && !reason.trim()}
          >
            SAVE CHANGES
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteUserDialog({ userId, isOpen, onClose, onConfirm }: DeleteUserDialogProps) {
  if (!userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] border-red-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-red-900">Confirm Deletion</DialogTitle>
          </div>
          <DialogDescription className="font-medium text-slate-500">
            This action is <span className="text-red-600 font-bold uppercase underline underline-offset-4">permanent</span>.
            The user account and all associated data will be removed from the system.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
            CANCEL
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(userId);
              onClose();
            }}
            className="font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
          >
            DELETE PERMANENTLY
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
