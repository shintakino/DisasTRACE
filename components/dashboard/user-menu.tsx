"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import { UserRole } from "@/lib/navigation";

interface UserMenuProps {
  role: UserRole;
  getRoleLabel: (role: UserRole | string | undefined) => string;
}

export default function UserMenu({ role, getRoleLabel }: UserMenuProps) {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-4 pl-6 border-l border-[#E2E8F0]">
      <div className="flex flex-col items-end hidden sm:flex min-w-[100px]">
        <span className="text-base font-semibold text-[#1E293B] leading-tight">
          {user?.fullName}
        </span>
        <span className="text-xs font-medium text-[#64748B]">
          {getRoleLabel(role)}
        </span>
      </div>
      <UserButton 
        appearance={{
          elements: {
            userButtonAvatarBox: "h-11 w-11 border-2 border-[#1E3A8A]/10 hover:border-[#1E3A8A]/30 transition-all",
            userButtonTrigger: "focus:shadow-none focus:ring-0",
          }
        }}
      />
      <ChevronDown className="size-5 text-[#64748B] hidden sm:block" />
    </div>
  );
}
