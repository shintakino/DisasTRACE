"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLogEntry } from "@/types/audit";
import { cn } from "@/lib/utils";

interface AuditTableProps {
  data: AuditLogEntry[];
}

export function AuditTable({ data }: AuditTableProps) {
  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: "userName",
      header: "USER",
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue("userName")}</span>,
    },
    {
      id: "action",
      header: "ACTION",
      cell: ({ row }) => {
        const action = row.original.action;
        const contextPath = row.original.contextPath;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm leading-tight">{action}</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-0.5">{contextPath}</span>
          </div>
        );
      },
    },
    {
      id: "dateTime",
      header: "DATE & TIME",
      cell: ({ row }) => {
        const date = row.original.date;
        const time = row.original.time;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 whitespace-nowrap">{date}</span>
            <span className="text-[10px] font-medium text-slate-500 uppercase">{time}</span>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 7,
      },
    },
  });

  return (
    <div className="bg-white rounded-b-xl border-x border-b shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
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
                className="hover:bg-slate-50/50 border-b last:border-0 h-16 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 font-medium">
                No audit logs found matching your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Showing {table.getRowModel().rows.length} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-slate-200 hover:bg-[#1E3A8A] hover:text-white transition-colors"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {[0, 1, 2].map((i) => (
              <Button
                key={i}
                variant={table.getState().pagination.pageIndex === i ? "default" : "ghost"}
                className={cn(
                  "h-8 w-8 rounded-full text-xs font-bold transition-all",
                  table.getState().pagination.pageIndex === i 
                    ? "bg-[#1E3A8A] text-white shadow-md" 
                    : "text-slate-500 hover:bg-slate-100"
                )}
                onClick={() => table.setPageIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-slate-200 hover:bg-[#1E3A8A] hover:text-white transition-colors"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
