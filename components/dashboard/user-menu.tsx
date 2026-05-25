"use client";

import { useAuth } from "@/hooks/use-auth";
import { createClientBrowser } from "@/lib/supabase";
import { ChevronDown, LogOut, User, Settings, ShieldCheck, FileText } from "lucide-react";
import { UserRole } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserMenuProps {
  role: UserRole;
  getRoleLabel: (role: UserRole | string | undefined) => string;
}

export default function UserMenu({ role, getRoleLabel }: UserMenuProps) {
  const { user } = useAuth();
  const supabase = createClientBrowser();
  const router = useRouter();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.first_name + " " + user?.user_metadata?.last_name || "Admin";

  return (
    <div className="flex items-center gap-4 pl-6 border-l border-[#E2E8F0]">
      <div className="flex flex-col items-end hidden sm:flex min-w-[100px]">
        <span className="text-base font-semibold text-[#1E293B] leading-tight">
          {fullName}
        </span>
        <span className="text-xs font-medium text-[#64748B]">
          {getRoleLabel(role)}
        </span>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <div className="flex items-center gap-2">
            <Avatar className="h-11 w-11 border-2 border-[#1E3A8A]/10 hover:border-[#1E3A8A]/30 transition-all">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-white">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-5 text-[#64748B] hidden sm:block" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/account?tab=profile")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account?tab=settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Help</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/help?tab=privacy")} className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Privacy Policy</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/help?tab=terms")} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              <span>Terms & Conditions</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsLogoutOpen(true)} 
            className="cursor-pointer text-[#1E3A8A] focus:text-[#1E3A8A] font-medium"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center pt-8 pb-6">
          <div className="bg-[#1E3A8A] text-white p-4 rounded-xl mb-2">
            <LogOut className="h-8 w-8" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Log Out</DialogTitle>
            <DialogDescription className="text-center text-sm mt-2 mb-4">
              Are you sure you want to log out your account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 w-full mt-4">
            <Button 
              variant="outline" 
              className="flex-1 bg-[#F1F5F9] border-none text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#1E293B]" 
              onClick={() => setIsLogoutOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white" 
              onClick={handleSignOut}
            >
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
