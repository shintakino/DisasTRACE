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
import { AlertTriangle, ShieldCheck, UserPlus, Ban, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

interface BanUserDialogProps {
  user: UserManagementEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => void;
}

export function BanUserDialog({ user, isOpen, onClose, onConfirm }: BanUserDialogProps) {
  const [spamming, setSpamming] = React.useState(false);
  const [abusive, setAbusive] = React.useState(false);
  const [other, setOther] = React.useState(false);
  const [otherReason, setOtherReason] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setSpamming(false);
      setAbusive(false);
      setOther(false);
      setOtherReason("");
    }
  }, [isOpen]);

  if (!user) return null;

  const handleBan = () => {
    const reasons = [];
    if (spamming) reasons.push("Spamming");
    if (abusive) reasons.push("Abusive Behavior");
    if (other && otherReason.trim()) reasons.push(`Other: ${otherReason.trim()}`);
    
    onConfirm(user.id, reasons.join(", "));
    onClose();
  };

  const isFormValid = spamming || abusive || (other && otherReason.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mx-auto mb-2 text-[#1E3A8A] flex justify-center items-center">
             <Ban className="h-10 w-10 text-[#1E3A8A]" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1E3A8A]">Ban User</DialogTitle>
          <DialogDescription className="font-medium text-slate-500 mt-2">
            Are you sure you want to ban this user?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="bg-[#E6E6FA] text-[#1E3A8A] p-4 rounded-xl flex items-center gap-3">
             <div className="bg-blue-300 rounded-full text-[#1E3A8A] w-6 h-6 flex items-center justify-center font-bold text-sm">!</div>
             <p className="font-medium text-sm">You are about to ban <span className="font-bold">{user.fullName}</span>.</p>
          </div>
        </div>

        <div className="py-2 grid gap-3">
          <Label className="text-sm font-semibold text-slate-700">Why are you banning this user?</Label>
          <div className="flex items-center space-x-2">
            <Checkbox id="spamming" checked={spamming} onCheckedChange={(val) => setSpamming(val === true)} />
            <label htmlFor="spamming" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Spamming
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="abusive" checked={abusive} onCheckedChange={(val) => setAbusive(val === true)} />
            <label htmlFor="abusive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Abusive Behavior
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="other" checked={other} onCheckedChange={(val) => setOther(val === true)} />
            <label htmlFor="other" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Other
            </label>
          </div>
          {other && (
            <Textarea
              placeholder="Please explain the reason for banning this user..."
              className="min-h-[80px] resize-none mt-2"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
            />
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-4 mt-4">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold bg-slate-200 hover:bg-slate-300 text-slate-700">
            Cancel
          </Button>
          <Button
            onClick={handleBan}
            disabled={!isFormValid}
            className="w-full font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white"
          >
            Ban
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteUserDialogProps {
  user: UserManagementEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteUserDialog({ user, isOpen, onClose, onConfirm }: DeleteUserDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mx-auto mb-2 text-[#1E3A8A] flex justify-center items-center">
             <Trash2 className="h-10 w-10 text-[#1E3A8A]" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1E3A8A]">Delete User</DialogTitle>
          <DialogDescription className="font-medium text-slate-500 mt-2">
            Are you sure you want to delete this user?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-[#E6E6FA] text-[#1E3A8A] p-4 rounded-xl flex items-center gap-3">
             <div className="bg-blue-300 rounded-full text-[#1E3A8A] w-6 h-6 flex items-center justify-center font-bold text-sm">!</div>
             <p className="font-medium text-sm">You are about to delete <span className="font-bold">{user.fullName}</span>.</p>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-4 mt-2">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold bg-slate-200 hover:bg-slate-300 text-slate-700">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(user.id);
              onClose();
            }}
            className="w-full font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onCreate: (user: { fullName: string; email: string; role: UserRole }) => void;
}

export function CreateUserDialog({ isOpen, onClose, defaultRole, onCreate }: CreateUserDialogProps) {
  const [role, setRole] = React.useState<UserRole>("cdrrmo_super_admin");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setRole(defaultRole || "cdrrmo_super_admin");
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, defaultRole]);

  const handleCreate = () => {
    onCreate({
      fullName,
      email,
      role,
    });
    onClose();
  };

  const isFormValid = fullName && email && password && confirmPassword && password === confirmPassword;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold">Create Account</DialogTitle>
          </div>
          <DialogDescription className="font-medium text-slate-500">
            Create a new administrative account for CDRRMO or PACC.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="create-role" className="text-xs font-black text-slate-400 uppercase tracking-widest">System Role</Label>
            <Select value={role} onValueChange={(val) => val && setRole(val as UserRole)}>
              <SelectTrigger id="create-role" className="h-11 font-bold text-slate-700">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cdrrmo_super_admin" className="font-medium">CDRRMO Admin</SelectItem>
                <SelectItem value="pacc_admin" className="font-medium">PACC Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName" className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-xs font-bold text-red-500 mt-[-1rem]">Passwords do not match</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
            CANCEL
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-[#1E3A8A] hover:bg-blue-800 text-white font-black px-6"
            disabled={!isFormValid}
          >
            CREATE ACCOUNT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
