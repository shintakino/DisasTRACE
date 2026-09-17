"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Truck, Siren, CheckCircle, Clock } from "lucide-react";
import { KpiData } from "@/types/dashboard";
import { motion } from "motion/react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0 }
};

export function KpiCards({ data }: { data: KpiData }) {
  const kpis = [
    {
      title: "TOTAL INCIDENTS TODAY",
      value: data.totalIncidentsToday,
      icon: Truck,
      accent: "border-blue-600 bg-blue-50 text-blue-950",
    },
    {
      title: "TOTAL RESPONDERS",
      value: data.totalResponders,
      icon: Siren,
      accent: "border-slate-300 bg-white text-slate-900",
    },
    {
      title: "TOTAL RESOLVED TODAY",
      value: data.totalResolvedToday,
      icon: CheckCircle,
      accent: "border-emerald-300 bg-white text-slate-900",
    },
    {
      title: "AVG RESPONSE TIME",
      value: `${data.avgResponseTime}m`,
      icon: Clock,
      accent: "border-amber-300 bg-white text-slate-900",
    },
  ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {kpis.map((kpi, index) => (
        <motion.div
          key={index}
          variants={item}
        >
          <Card className={`relative h-28 overflow-hidden rounded-2xl border-l-4 p-0 shadow-sm ${kpi.accent}`}>
            <CardContent className="relative z-10 h-full w-full p-5">
              <div className="flex flex-col h-full">
                <p className="mb-1 text-4xl font-black">{kpi.value}</p>
                <p className="mt-auto text-xs font-bold uppercase tracking-wide text-slate-600">{kpi.title}</p>
              </div>
              
              <div className="absolute right-5 top-5 text-slate-400">
                <kpi.icon className="size-8 stroke-[2]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
