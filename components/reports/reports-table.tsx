"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportEntry, ReportStatus } from "@/types/reports";
import { cn } from "@/lib/utils";

interface ReportsTableProps {
  data: ReportEntry[];
  onViewDetails: (id: string) => void;
}

const StatusBadge = ({ status }: { status: ReportStatus }) => {
  const styles: Record<ReportStatus, string> = {
    DISPATCHED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    "ON-SCENE": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    CANCELLED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    PENDING: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800",
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-bold text-[10px] tracking-wide", styles[status])}>
      {status}
    </Badge>
  );
};

export function ReportsTable({ data, onViewDetails }: ReportsTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<ReportEntry>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-slate-300 data-[state=checked]:bg-[#1E3A8A] data-[state=checked]:border-[#1E3A8A]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-slate-300 data-[state=checked]:bg-[#1E3A8A] data-[state=checked]:border-[#1E3A8A]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "responderName",
      header: "RESPONDER NAME",
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue("responderName")}</span>,
    },
    {
      accessorKey: "type",
      header: "INCIDENT TYPE",
      cell: ({ row }) => <span className="font-medium text-slate-600">{row.getValue("type")}</span>,
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => <StatusBadge status={row.getValue("status") as ReportStatus} />,
    },
    {
      id: "dateTime",
      header: "DATE & TIME",
      cell: ({ row }) => {
        const date = row.original.date;
        const time = row.original.time;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">{date}</span>
            <span className="text-[10px] font-medium text-slate-500">{time}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "LOCATION",
      cell: ({ row }) => <span className="text-sm text-slate-600 truncate max-w-[200px]" title={row.getValue("location")}>{row.getValue("location")}</span>,
    },
    {
      id: "actions",
      header: "ACTION",
      cell: ({ row }) => (
        <Button
          onClick={() => onViewDetails(row.original.id)}
          className="bg-[#1E3A8A] hover:bg-blue-800 text-white text-[10px] font-black px-4 h-7 rounded shadow-sm"
        >
          VIEW
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
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
                data-state={row.getIsSelected() && "selected"}
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
                No reports found matching your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected
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
