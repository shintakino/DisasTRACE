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
import { AlertTriangle, ShieldCheck, UserPlus, Ban, Trash2, X } from "lucide-react";
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
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Manage User</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Updating permissions and status for <span className="font-bold text-white">{user.fullName}</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-5">
          <div className="grid gap-2 text-left">
            <Label htmlFor="role" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">System Role</Label>
            <Select value={role} onValueChange={(val) => val && setRole(val as UserRole)}>
              <SelectTrigger id="role" className="h-11 font-bold text-slate-700 bg-white border-slate-200">
                <SelectValue placeholder="Select Role">
                  {role === "public_user" && "Public User"}
                  {role === "ambulance_responder" && "Responder"}
                  {role === "pacc_admin" && "PACC Admin"}
                  {role === "cdrrmo_super_admin" && "CDRRMO Super Admin"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public_user" className="font-medium">Public User</SelectItem>
                <SelectItem value="ambulance_responder" className="font-medium">Responder</SelectItem>
                <SelectItem value="pacc_admin" className="font-medium">PACC Admin</SelectItem>
                <SelectItem value="cdrrmo_super_admin" className="font-medium">CDRRMO Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 text-left">
            <Label htmlFor="status" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Account Status</Label>
            <Select value={status} onValueChange={(val) => val && setStatus(val as UserStatus)}>
              <SelectTrigger id="status" className="h-11 font-bold text-slate-700 bg-white border-slate-200">
                <SelectValue placeholder="Select Status">
                  {status === "ACTIVE" && "Active"}
                  {status === "SUSPENDED" && "Suspended"}
                  {status === "DEACTIVATED" && "Deactivated"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="font-medium text-green-600">Active</SelectItem>
                <SelectItem value="SUSPENDED" className="font-medium text-orange-600">Suspended</SelectItem>
                <SelectItem value="DEACTIVATED" className="font-medium text-red-600">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "SUSPENDED" || status === "DEACTIVATED") && (
            <div className="grid gap-2 text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="reason" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                Reason for {status === "SUSPENDED" ? "Suspension" : "Deactivation"}
              </Label>
              <Textarea
                id="reason"
                placeholder="Briefly explain the reason for this action..."
                className="min-h-[100px] resize-none border-slate-200 bg-white focus:border-blue-500 font-medium"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
            CANCEL
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-[#1E3A8A] hover:bg-blue-800 text-white font-black px-6 rounded-xl h-11"
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
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <Ban className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Ban User</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Are you sure you want to ban this user?
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-5">
          <div className="bg-[#EBF0FC] text-[#1e1b4b] p-4 rounded-xl flex items-center gap-3 font-semibold text-sm">
            <div className="bg-[#8A9BBF] rounded-full text-white w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">!</div>
            <p>You are about to ban <span className="font-bold">{user.fullName}</span>.</p>
          </div>

          <div className="space-y-3 text-left">
            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Why are you banning this user?</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="spamming" checked={spamming} onCheckedChange={(val) => setSpamming(val === true)} />
              <label htmlFor="spamming" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Spamming
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="abusive" checked={abusive} onCheckedChange={(val) => setAbusive(val === true)} />
              <label htmlFor="abusive" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Abusive Behavior
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="other" checked={other} onCheckedChange={(val) => setOther(val === true)} />
              <label htmlFor="other" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Other
              </label>
            </div>
            {other && (
              <Textarea
                placeholder="Please explain the reason for banning this user..."
                className="min-h-[80px] resize-none mt-2 border-slate-200 bg-white font-medium focus-visible:ring-[#2B4C9B]"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl py-5 h-auto text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleBan}
            disabled={!isFormValid}
            className="w-full font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl py-5 h-auto text-sm"
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
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Delete User</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Are you sure you want to delete this user?
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 space-y-5">
          <div className="bg-[#EBF0FC] text-[#1e1b4b] p-4 rounded-xl flex items-center gap-3 font-semibold text-sm">
            <div className="bg-[#8A9BBF] rounded-full text-white w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">!</div>
            <p>You are about to delete <span className="font-bold">{user.fullName}</span>.</p>
          </div>
          <p className="text-xs font-bold text-red-500 text-center uppercase tracking-wider">Warning: This action will permanently remove all referencing logs and audit trails.</p>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-4 shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl py-5 h-auto text-sm">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(user.id);
              onClose();
            }}
            className="w-full font-bold bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl py-5 h-auto text-sm"
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
  onCreate: (user: { fullName: string; email: string; role: UserRole; password?: string }) => void;
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
      password,
    });
    onClose();
  };


  const isFormValid = fullName && email && password && confirmPassword && password === confirmPassword;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
        <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-white tracking-tight">Create Account</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-medium mt-1">
                Create a new administrative account for CDRRMO or PACC.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30 flex-1 overflow-y-auto space-y-5">
          <div className="grid gap-2 text-left">
            <Label htmlFor="create-role" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">System Role</Label>
            <Select value={role} onValueChange={(val) => val && setRole(val as UserRole)}>
              <SelectTrigger id="create-role" className="h-11 font-bold text-slate-700 bg-white border-slate-200">
                <SelectValue placeholder="Select Role">
                  {role === "cdrrmo_super_admin" && "Super Admin"}
                  {role === "pacc_admin" && "PACC Admin"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cdrrmo_super_admin" className="font-medium">Super Admin</SelectItem>
                <SelectItem value="pacc_admin" className="font-medium">PACC Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 text-left">
            <Label htmlFor="fullName" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 rounded-xl bg-white border-slate-200 px-4"
            />
          </div>

          <div className="grid gap-2 text-left">
            <Label htmlFor="email" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl bg-white border-slate-200 px-4"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2 text-left">
              <Label htmlFor="password" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 px-4"
              />
            </div>
            
            <div className="grid gap-2 text-left">
              <Label htmlFor="confirmPassword" className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl bg-white border-slate-200 px-4"
              />
            </div>
          </div>
          
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-xs font-bold text-red-500 mt-1 text-left pl-1">Passwords do not match</p>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">
            CANCEL
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-[#1E3A8A] hover:bg-blue-800 text-white font-black px-6 rounded-xl h-11"
            disabled={!isFormValid}
          >
            CREATE ACCOUNT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
