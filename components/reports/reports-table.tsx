"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Car,
  AlertTriangle,
  Stethoscope,
  Flame,
  Waves,
  HelpCircle,
  MoveRight,
  MapPin,
  FileDown,
  Eye,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ReportTableItem, IncidentType, ReportStatus } from "@/types/reports";
import { cn } from "@/lib/utils";

interface ReportsTableProps {
  data: ReportTableItem[];
  onViewDetails: (id: string) => void;
  onDownloadPDF: (id: string) => void;
}

const IncidentTypeIcon = ({ type }: { type: IncidentType }) => {
  switch (type) {
    case "Vehicular Collision":
      return <Car className="h-4 w-4 text-blue-500" />;
    case "Medical Emergency":
      return <Stethoscope className="h-4 w-4 text-green-500" />;
    case "Structural Failure":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "Fire/Explosion":
      return <Flame className="h-4 w-4 text-red-500" />;
    case "Flood/Water":
      return <Waves className="h-4 w-4 text-cyan-500" />;
    default:
      return <HelpCircle className="h-4 w-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: ReportStatus }) => {
  const colors: Record<ReportStatus, string> = {
    NEW: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    ONGOING: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    COMPLETED: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    STANDBY: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800",
  };

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 font-semibold", colors[status])}>
      {status}
    </Badge>
  );
};

export function ReportsTable({ data, onViewDetails, onDownloadPDF }: ReportsTableProps) {
  const columns: ColumnDef<ReportTableItem>[] = [
    {
      accessorKey: "id",
      header: "Case ID",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-primary">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "vehicleId",
      header: "Vehicle",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue("vehicleId")}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Incident Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as IncidentType;
        return (
          <div className="flex items-center gap-2">
            <IncidentTypeIcon type={type} />
            <span className="text-sm font-medium">{type}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location (Origin → Destination)",
      cell: ({ row }) => {
        const origin = row.original.origin;
        const destination = row.original.destination;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]" title={origin}>{origin}</span>
            <MoveRight className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]" title={destination}>{destination}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const date = new Date(row.getValue("timestamp"));
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{format(date, "MMM dd, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(date, "HH:mm:ss")}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status") as ReportStatus} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewDetails(row.original.id)}
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDownloadPDF(row.original.id)}
            title="Download PDF"
          >
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
