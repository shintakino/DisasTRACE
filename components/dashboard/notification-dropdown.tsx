"use client"

import { useState } from "react"
import { Bell, CheckSquare, Siren } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Notification = {
  id: string
  type: "new" | "resolved"
  title: string
  time: string
  unread: boolean
  highlightTag: string
  referenceId: string
  description: string
  tagFirst: boolean
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "new",
    title: "New Incident Report",
    time: "1 h ago",
    unread: true,
    highlightTag: "Fire Emergency",
    referenceId: "DR-2026-0847",
    description: "Brgy.Sabang · Critical severity. Ambulance dispatched to scene.",
    tagFirst: true,
  },
  {
    id: "2",
    type: "resolved",
    title: "Incident Resolved",
    time: "Yesterday",
    unread: true,
    highlightTag: "Vehicular Collision",
    referenceId: "DR-2026-0841",
    description: "San Jose Hwy · Reported by Bastes, M.",
    tagFirst: false,
  },
  {
    id: "3",
    type: "new",
    title: "New Incident Report",
    time: "Yesterday",
    unread: true,
    highlightTag: "Vehicular Collision",
    referenceId: "DR-2026-0841",
    description: "San Jose Hwy · Critical severity. Ambulance dispatched to scene.",
    tagFirst: true,
  }
]

export function NotificationDropdown() {
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [isOpen, setIsOpen] = useState(false)

  // Determine unread count to show on the bell icon
  const hasUnread = notifications.some(n => n.unread)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 text-[#64748B] hover:text-[#1E3A8A] transition-colors focus:outline-none">
          <Bell className="size-7" />
          {hasUnread && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-white" />
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        className="w-[450px] p-0 rounded-2xl shadow-xl overflow-hidden border-slate-100"
      >
        <div className="p-5">
          <h2 className="text-[#1E3A8A] font-bold text-sm tracking-wide mb-4">NOTIFICATIONS</h2>
          
          <div className="flex p-1 bg-slate-50 rounded-lg mb-4 border border-slate-100">
            <button
              onClick={() => setTab("all")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "all" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-slate-100"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setTab("unread")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === "unread" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-slate-100"
              }`}
            >
              UNREAD
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex gap-4 p-2">
                <div className="shrink-0 mt-1">
                  {notification.type === "new" ? (
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Siren className="size-6 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <CheckSquare className="size-6 text-[#1E3A8A]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900">{notification.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-800">{notification.time}</span>
                      {notification.unread && (
                        <div className="size-2 rounded-full bg-red-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm">
                    {notification.tagFirst ? (
                      <p>
                        <span className="text-blue-500 font-medium">{notification.highlightTag}</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="font-semibold text-slate-800">{notification.referenceId}</span>
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold text-slate-800">{notification.referenceId}</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="text-blue-500 font-medium">{notification.highlightTag}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-blue-500/80 leading-snug pr-4">
                    {notification.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
