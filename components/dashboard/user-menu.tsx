"use client";

import { useAuth } from "@/hooks/use-auth";
import { createClientBrowser } from "@/lib/supabase";
import { ChevronDown, LogOut, User } from "lucide-react";
import { UserRole } from "@/lib/navigation";
import { useRouter } from "next/navigation";
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
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
