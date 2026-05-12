"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { StatusLogEntry, LogStatus, LogAction } from "@/types/logs"
import { cn } from "@/lib/utils"

const statusConfig: Record<LogStatus, { label: string, className: string }> = {
  DISPATCHED: { 
    label: "DISPATCHED", 
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-none" 
  },
  STANDBY: { 
    label: "STANDBY", 
    className: "bg-green-100 text-green-700 hover:bg-green-100/80 border-none" 
  },
  "ON-SCENE": { 
    label: "ON-SCENE", 
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-none" 
  },
  "OFF-DUTY": { 
    label: "OFF-DUTY", 
    className: "bg-slate-100 text-slate-700 hover:bg-slate-100/80 border-none" 
  },
}

const actionConfig: Record<LogAction, { label: string, className: string }> = {
  DISPATCHED: { 
    label: "DISPATCHED", 
    className: "bg-blue-50 text-blue-600 border-blue-200" 
  },
  COMPLETED: { 
    label: "COMPLETED", 
    className: "bg-green-50 text-green-600 border-green-200" 
  },
  ARRIVED: { 
    label: "ARRIVED", 
    className: "bg-amber-50 text-amber-600 border-amber-200" 
  },
  STARTED: { 
    label: "STARTED", 
    className: "bg-indigo-50 text-indigo-600 border-indigo-200" 
  },
  ENDED: { 
    label: "ENDED", 
    className: "bg-slate-50 text-slate-600 border-slate-200" 
  },
  NONE: { 
    label: "-", 
    className: "bg-transparent text-slate-400 border-none shadow-none" 
  },
}

const columns: ColumnDef<StatusLogEntry>[] = [
  {
    id: "dateTime",
    header: "Date & Time",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-[#1E293B] whitespace-nowrap">{row.original.date}</span>
        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">{row.original.time}</span>
      </div>
    ),
  },
  {
    accessorKey: "responderName",
    header: "Responder Name",
    cell: ({ row }) => (
      <div className="font-bold text-[#1E293B]">{row.getValue("responderName")}</div>
    ),
  },
  {
    accessorKey: "logDescription",
    header: "Log",
    cell: ({ row }) => {
      const description = row.getValue("logDescription") as string
      // Highlight incident IDs like DR-2026-0047
      const parts = description.split(/(DR-\d{4}-\d{4})/)
      return (
        <div className="font-medium text-[#1E293B] max-w-[300px]">
          {parts.map((part, i) => 
            part.match(/DR-\d{4}-\d{4}/) ? (
              <span key={i} className="text-[#1E3A8A] font-bold underline underline-offset-2 cursor-pointer">{part}</span>
            ) : (
              <span key={i} className="text-[#64748B]">{part}</span>
            )
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as LogStatus
      const config = statusConfig[status]
      return (
        <Badge className={cn("px-3 py-1 text-[10px] font-bold tracking-wider rounded-full", config.className)}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.getValue("action") as LogAction
      const config = actionConfig[action]
      return (
        <Badge variant="outline" className={cn("px-3 py-1 text-[10px] font-bold tracking-wider rounded-md", config.className)}>
          {config.label}
        </Badge>
      )
    },
  },
]

interface LogsTableProps {
  data: StatusLogEntry[]
}

export function LogsTable({ data }: LogsTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
      <CardHeader className="bg-[#1E3A8A] text-white p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold tracking-tight">Status & Activity Logs</CardTitle>
          <div className="text-sm font-medium opacity-80 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-[#F8FAFC]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-[#E2E8F0]">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-[#64748B] font-bold text-[11px] uppercase tracking-wider px-6">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-[#F1F5F9]/50 border-b-[#E2E8F0] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#64748B]">
                  No activity logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Custom Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0]">
          <div className="text-xs font-medium text-[#64748B]">
            Showing <span className="text-[#1E293B]">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to <span className="text-[#1E293B]">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</span> of <span className="text-[#1E293B]">{data.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            
            {Array.from({ length: table.getPageCount() }, (_, i) => i).map((page) => (
              <Button
                key={page}
                variant={table.getState().pagination.pageIndex === page ? "default" : "outline"}
                size="icon"
                className={cn(
                  "size-8 rounded-full text-xs font-bold transition-all duration-200",
                  table.getState().pagination.pageIndex === page 
                    ? "bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 shadow-md scale-110" 
                    : "border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
                )}
                onClick={() => table.setPageIndex(page)}
              >
                {page + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
