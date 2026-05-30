"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, UserMinus, Ban, Trash2, ShieldAlert } from "lucide-react";
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
import { UserManagementEntry, UserStatus, UserRole } from "@/types/users";
import { cn } from "@/lib/utils";

interface UsersTableProps {
  data: UserManagementEntry[];
  onManageStatus: (user: UserManagementEntry) => void;
  onBan: (user: UserManagementEntry) => void;
  onDelete: (user: UserManagementEntry) => void;
}

const StatusBadge = ({ status }: { status: UserStatus }) => {
  const styles: Record<UserStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-200",
    SUSPENDED: "bg-orange-100 text-orange-700 border-orange-200",
    DEACTIVATED: "bg-red-100 text-red-700 border-red-200",
    PENDING: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-bold text-[10px] tracking-wide", styles[status])}>
      {status}
    </Badge>
  );
};

const RoleLabel = ({ role }: { role: UserRole }) => {
  const labels: Record<UserRole, string> = {
    public_user: "PUBLIC USER",
    ambulance_responder: "RESPONDER",
    pacc_admin: "PACC ADMIN",
    cdrrmo_super_admin: "SUPER ADMIN",
  };

  return <span className="text-[10px] font-black text-slate-500 tracking-wider">{labels[role]}</span>;
};

export function UsersTable({ data, onManageStatus, onBan, onDelete }: UsersTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<UserManagementEntry>[] = [
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
      accessorKey: "fullName",
      header: "FULL NAME",
      cell: ({ row }) => <span className="font-bold text-slate-800">{row.getValue("fullName")}</span>,
    },
    {
      accessorKey: "email",
      header: "EMAIL ADDRESS",
      cell: ({ row }) => <span className="font-medium text-slate-600">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => <StatusBadge status={row.getValue("status") as UserStatus} />,
    },
    {
      accessorKey: "role",
      header: "ROLE",
      cell: ({ row }) => <RoleLabel role={row.getValue("role") as UserRole} />,
    },
    {
      accessorKey: "joinedDate",
      header: "JOINED DATE",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.getValue("joinedDate")}</span>,
    },
    {
      accessorKey: "lastActive",
      header: "LAST ACTIVE",
      cell: ({ row }) => <span className="text-xs font-medium text-slate-500 italic">{row.getValue("lastActive")}</span>,
    },
    {
      id: "actions",
      header: "ACTION",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onManageStatus(row.original)}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Manage Status & Role"
          >
            <ShieldAlert className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onBan(row.original)}
            className="h-8 w-8 text-[#1E3A8A] hover:text-blue-900 hover:bg-blue-50"
            title="Ban User"
          >
            <Ban className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(row.original)}
            className="h-8 w-8 text-[#1E3A8A] hover:text-blue-900 hover:bg-blue-50"
            title="Delete User"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
                No users found matching your search.
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
            {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
              const pageCount = table.getPageCount();
              const currentIndex = table.getState().pagination.pageIndex;
              let pageIdx = i;
              
              if (pageCount > 5) {
                if (currentIndex > 2) {
                  pageIdx = currentIndex - 2 + i;
                  if (pageIdx + (5 - i) > pageCount) {
                    pageIdx = pageCount - 5 + i;
                  }
                }
              }
              
              if (pageIdx >= pageCount) return null;
              
              return (
                <Button
                  key={pageIdx}
                  variant={currentIndex === pageIdx ? "default" : "ghost"}
                  className={cn(
                    "h-8 w-8 rounded-full text-xs font-bold",
                    currentIndex === pageIdx ? "bg-[#1E3A8A] text-white" : "text-slate-500 hover:bg-slate-100"
                  )}
                  onClick={() => table.setPageIndex(pageIdx)}
                >
                  {pageIdx + 1}
                </Button>
              );
            })}
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
