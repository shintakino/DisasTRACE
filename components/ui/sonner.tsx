"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#0F172A",
          "--normal-border": "#CBD5E1",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-300 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl p-4 font-sans border text-left",
          title: "group-[.toast]:text-slate-900 font-black text-sm tracking-tight",
          description: "group-[.toast]:text-slate-800 font-medium text-xs mt-1 leading-normal",
          actionButton: "group-[.toast]:bg-[#1E3A8A] group-[.toast]:text-white hover:group-[.toast]:bg-blue-900 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
