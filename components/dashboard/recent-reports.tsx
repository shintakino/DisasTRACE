import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ArrowRight } from "lucide-react";
import { RecentReport } from "@/types/dashboard";

export function RecentReports({ reports }: { reports: RecentReport[] }) {
  if (reports.length === 0) {
    return (
      <Card className="border-none shadow-sm h-full">
        <CardHeader>
          <CardTitle className="text-navy-900">Recent Incident Reports</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Empty>
            <EmptyTitle>No recent incidents</EmptyTitle>
            <EmptyDescription>Activity will appear here when reports are filed.</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-navy-900">Recent Incident Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          {reports.map((report) => (
            <div key={report.id} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                  {report.vehicleId}
                </Badge>
                <span className="text-xs font-bold text-navy-900">{report.id}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="w-0.5 h-4 bg-gray-200" />
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[120px]">{report.origin}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="font-medium truncate max-w-[120px] text-right">{report.destination}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
