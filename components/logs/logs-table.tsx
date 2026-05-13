"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusLogEntry, LogStatus, LogAction } from "@/types/logs";
import { cn } from "@/lib/utils";

interface LogsTableProps {
  data: StatusLogEntry[];
  hideActionColumn?: boolean;
}

const StatusBadge = ({ status }: { status: LogStatus }) => {
  const styles: Record<LogStatus, string> = {
    DISPATCHED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    STANDBY: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    "ON-SCENE": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    "OFF-DUTY": "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800",
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-bold text-[10px] tracking-wide", styles[status])}>
      {status}
    </Badge>
  );
};

const ActionBadge = ({ action }: { action: LogAction }) => {
  if (action === "NONE") return <span className="text-slate-300">—</span>;

  const styles: Record<Exclude<LogAction, "NONE">, string> = {
    DISPATCHED: "bg-blue-500 text-white border-transparent",
    COMPLETED: "bg-green-500 text-white border-transparent",
    ARRIVED: "bg-amber-500 text-white border-transparent",
    STARTED: "bg-emerald-500 text-white border-transparent",
    ENDED: "bg-slate-500 text-white border-transparent",
  };

  return (
    <Badge className={cn("px-2 py-0.5 font-black text-[9px] tracking-widest", styles[action])}>
      {action}
    </Badge>
  );
};

export function LogsTable({ data, hideActionColumn = false }: LogsTableProps) {
  const columns: ColumnDef<StatusLogEntry>[] = [
    {
      id: "dateTime",
      header: "DATE & TIME",
      cell: ({ row }) => {
        const date = row.original.date;
        const time = row.original.time;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">{date}</span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{time}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "responderName",
      header: "RESPONDER NAME",
      cell: ({ row }) => <span className="font-bold text-slate-800 uppercase tracking-tight">{row.getValue("responderName")}</span>,
    },
    {
      accessorKey: "logDescription",
      header: "LOG",
      cell: ({ row }) => {
        const description = row.getValue("logDescription") as string;
        // Highlight incident IDs (e.g., DR-2026-0047)
        const parts = description.split(/(DR-\d{4}-\d{4})/g);
        return (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3 text-slate-300 shrink-0" />
            <span className="text-sm text-slate-600 font-medium leading-tight">
              {parts.map((part, i) => 
                part.match(/DR-\d{4}-\d{4}/) ? (
                  <span key={i} className="text-[#1E3A8A] font-black underline decoration-blue-200 underline-offset-2">
                    {part}
                  </span>
                ) : part
              )}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => <StatusBadge status={row.getValue("status") as LogStatus} />,
    },
  ];

  // Only add action column if not hidden
  if (!hideActionColumn) {
    columns.push({
      accessorKey: "action",
      header: "ACTION",
      cell: ({ row }) => <ActionBadge action={row.getValue("action") as LogAction} />,
    });
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
              <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 font-medium uppercase tracking-widest text-xs">
                No activity logs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Showing {table.getRowModel().rows.length} logs
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
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
                  "h-8 w-8 rounded-full text-xs font-bold",
                  table.getState().pagination.pageIndex === i ? "bg-[#1E3A8A] text-white" : "text-slate-500 hover:bg-slate-100"
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
            className="h-8 w-8 rounded-full"
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
