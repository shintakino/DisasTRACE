import { Card, CardContent } from "@/components/ui/card";
import { Truck, Siren, CheckCircle, Clock } from "lucide-react";
import { KpiData } from "@/types/dashboard";

export function KpiCards({ data }: { data: KpiData }) {
  const kpis = [
    {
      title: "Total Incidents Today",
      value: data.totalIncidentsToday,
      icon: Truck,
      gradient: "from-blue-600 to-blue-400",
    },
    {
      title: "Total Responders",
      value: data.totalResponders,
      icon: Siren,
      gradient: "from-red-600 to-red-400",
    },
    {
      title: "Total Resolved Today",
      value: data.totalResolvedToday,
      icon: CheckCircle,
      gradient: "from-green-600 to-green-400",
    },
    {
      title: "Avg Response Time",
      value: data.avgResponseTime,
      icon: Clock,
      gradient: "from-orange-600 to-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index} className="overflow-hidden border-none shadow-sm">
          <CardContent className={`p-6 bg-gradient-to-br ${kpi.gradient} text-white flex items-center justify-between relative`}>
            {/* Glassmorphism effect overlay */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
            
            <div className="relative z-10">
              <p className="text-sm font-medium opacity-90">{kpi.title}</p>
              <p className="text-3xl font-extrabold mt-1">{kpi.value}</p>
            </div>
            <div className="relative z-10 p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <kpi.icon className="h-8 w-8 text-white" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
