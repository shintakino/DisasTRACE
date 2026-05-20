import {
  LayoutGrid,
  Map as MapIcon,
  FileText,
  Folder,
  Users,
  UserCheck,
  ClipboardList,
  UserPlus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export const CDRRMO_NAV: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Map",
    url: "/map",
    icon: MapIcon,
  },
  {
    title: "Status & Logs",
    url: "/logs",
    icon: Folder,
  },
  {
    title: "Verification",
    url: "/verification",
    icon: ShieldCheck,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "User Management",
    url: "/users",
    icon: Users,
  },
  {
    title: "Users Approval",
    url: "/users/approval",
    icon: UserPlus,
  },
  {
    title: "Responder Roster",
    url: "/roster",
    icon: UserCheck,
  },
  {
    title: "Audit Logs",
    url: "/audit",
    icon: ClipboardList,
  },
]

export const PACC_NAV: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Map",
    url: "/map",
    icon: MapIcon,
  },
  {
    title: "Status & Logs",
    url: "/logs",
    icon: Folder,
  },
  {
    title: "Verification",
    url: "/verification",
    icon: ShieldCheck,
  },
]

export type UserRole = 'cdrrmo_super_admin' | 'pacc_admin' | 'ambulance_responder' | 'public_user'

export const getNavItems = (role: UserRole | string | undefined): NavItem[] => {
  if (role === 'pacc_admin') return PACC_NAV
  return CDRRMO_NAV
}
