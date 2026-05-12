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
      gradient: "from-[#4776E6] to-[#3843D0]", // Vibrant blue
    },
    {
      title: "TOTAL RESPONDERS",
      value: data.totalResponders,
      icon: Siren,
      gradient: "from-[#FF416C] to-[#FF4B2B]", // Vibrant red
    },
    {
      title: "TOTAL RESOLVED TODAY",
      value: data.totalResolvedToday,
      icon: CheckCircle,
      gradient: "from-[#11998e] to-[#38ef7d]", // Vibrant green
    },
    {
      title: "AVG RESPONSE TIME",
      value: `${data.avgResponseTime}m`,
      icon: Clock,
      gradient: "from-[#f09819] to-[#edde5d]", // Vibrant orange/yellow
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
          whileHover={{ scale: 1.02, translateY: -5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card className={`overflow-hidden border-none ring-0 shadow-xl rounded-3xl p-0 bg-gradient-to-br ${kpi.gradient} relative h-32`}>
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-black/5" />
            
            <CardContent className="p-6 text-white relative z-10 h-full w-full">
              <div className="flex flex-col h-full">
                <p className="text-4xl font-black mb-1">{kpi.value}</p>
                <p className="text-[10px] font-bold tracking-widest opacity-80 uppercase mt-auto">{kpi.title}</p>
              </div>
              
              <div className="absolute top-6 right-6 opacity-30">
                <kpi.icon className="size-8 stroke-[2]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
