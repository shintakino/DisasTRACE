"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, UserX, Trash2 } from "lucide-react"
import { RosterEntry, RosterStatus } from "@/types/roster"
import { cn } from "@/lib/utils"

const statusConfig: Record<RosterStatus, { label: string, className: string }> = {
  ACTIVE: { 
    label: "ACTIVE", 
    className: "bg-[#E6F4EA] text-[#1E8E3E] hover:bg-[#E6F4EA]/80 border-none px-4" 
  },
  DEACTIVATED: { 
    label: "DEACTIVATED", 
    className: "bg-[#FCE8E6] text-[#D93025] hover:bg-[#FCE8E6]/80 border-none px-4" 
  },
  SUSPENDED: { 
    label: "SUSPENDED", 
    className: "bg-[#FEF7E0] text-[#E37400] hover:bg-[#FEF7E0]/80 border-none px-4" 
  },
}

interface RosterTableProps {
  data: RosterEntry[]
  searchComponent?: React.ReactNode
  filterComponent?: React.ReactNode
  onManage?: (id: string) => void
  onDelete?: (id: string) => void
}

export function RosterTable({ data, searchComponent, filterComponent, onManage, onDelete }: RosterTableProps) {
  const columns = React.useMemo<ColumnDef<RosterEntry>[]>(() => [
    {
      accessorKey: "fullName",
      header: "FULL NAME",
      cell: ({ row }) => (
        <div className="font-medium text-[#111827]">{row.getValue("fullName")}</div>
      ),
    },
    {
      accessorKey: "email",
      header: "EMAIL ADDRESS",
      cell: ({ row }) => (
        <div className="font-medium text-[#111827]">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => {
        const status = row.getValue("status") as RosterStatus
        const config = statusConfig[status]
        return (
          <Badge className={cn("py-1 text-[11px] font-bold tracking-wider rounded-full uppercase", config.className)}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "role",
      header: "ROLE",
      cell: ({ row }) => (
        <div className="font-medium text-[#111827] uppercase">{row.getValue("role")}</div>
      ),
    },
    {
      id: "actions",
      header: "ACTION",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <button 
              className="text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => onManage?.(row.original.id)}
            >
              <UserX className="size-5" />
            </button>
            <button 
              className="text-gray-500 hover:text-red-600 transition-colors"
              onClick={() => onDelete?.(row.original.id)}
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        )
      },
    },
  ], [onManage, onDelete])

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
    <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white">
      <div className="bg-[#2B4C9B] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white tracking-wide">Users</h2>
        <div className="flex items-center gap-3">
          {searchComponent}
          {filterComponent}
        </div>
      </div>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-white border-b border-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-14 text-black font-bold text-xs uppercase tracking-widest px-6">
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
                  className="hover:bg-gray-50 border-b border-gray-100 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-gray-500">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Custom Pagination matching the design */}
        <div className="flex justify-end px-6 py-6 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            
            {Array.from({ length: table.getPageCount() || 10 }, (_, i) => i).map((page) => {
              // Just a simplified pagination rendering to match the "1 2 3 ... 10" look for the mock
              if (page > 2 && page < 9) {
                if (page === 3) return <span key={page} className="px-1 text-gray-400">...</span>
                return null;
              }
              const isSelected = table.getState().pagination.pageIndex === page;
              return (
                <Button
                  key={page}
                  variant={isSelected ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-8 rounded-full text-sm font-medium",
                    isSelected
                      ? "bg-[#2B4C9B] text-white hover:bg-[#2B4C9B]/90 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() => table.setPageIndex(page)}
                >
                  {page + 1}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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
