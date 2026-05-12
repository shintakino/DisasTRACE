"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { getNavItems, UserRole } from "@/lib/navigation"
import { useUser } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const role = user?.publicMetadata?.role as UserRole
  const navItems = getNavItems(role)

  const getRoleLabel = (role: UserRole | string | undefined) => {
    switch (role) {
      case 'pacc_admin': return 'PACC Admin'
      case 'cdrrmo_super_admin': return 'Super Admin'
      default: return 'Admin'
    }
  }

  const getOrgLabel = (role: UserRole | string | undefined) => {
    switch (role) {
      case 'pacc_admin': return 'PACC'
      case 'cdrrmo_super_admin': return 'CDRRMO'
      default: return 'DisasTRACE'
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-mesh-gradient text-white overflow-hidden shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[3px] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none -z-5" />
      <SidebarHeader className="flex items-center justify-center p-0 py-12 group-data-[state=expanded]:px-8 group-data-[state=expanded]:justify-start relative z-10 transition-all">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-16 w-16 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14 shrink-0 transition-all">
            <Image
              src="/assets/logoBaliwag.png"
              alt="Baliwag CDRRMO Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden">
            <span className="text-xl font-bold tracking-tight leading-none mb-1">
              <span className="text-[#EF4444]">Disas</span>
              <span className="text-white">TRACE</span>
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] leading-none">
                {getOrgLabel(role)}
              </span>
              <span className="text-[9px] font-medium text-white/60 uppercase tracking-[0.1em] leading-none">
                {getRoleLabel(role)}
              </span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup className="p-0">
          <SidebarGroupContent className="p-0">
            <SidebarMenu className="gap-8 flex flex-col items-center group-data-[state=expanded]:items-start py-6">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title} className="w-full flex justify-center group-data-[state=expanded]:justify-start px-4">
                  <SidebarMenuButton
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-12 w-12 group-data-[state=expanded]:w-full flex items-center justify-center group-data-[state=expanded]:justify-start rounded-xl transition-all"
                    render={(props) => (
                      <Link href={item.url} {...props} className="flex items-center gap-3 w-full">
                        <item.icon className="size-6 shrink-0" />
                        <span className="group-data-[state=collapsed]:hidden font-medium truncate">
                          {item.title}
                        </span>
                      </Link>
                    )}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
