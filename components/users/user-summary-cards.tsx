"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, UserMinus } from "lucide-react";
import { motion } from "motion/react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0 },
};

interface UserSummaryProps {
  data: {
    total: number;
    active: number;
    suspended: number;
    deactivated: number;
  };
}

export function UserSummaryCards({ data }: UserSummaryProps) {
  const summaries = [
    {
      title: "TOTAL USERS",
      value: data.total,
      icon: Users,
      gradient: "from-[#4776E6] to-[#3843D0]", // Vibrant blue
    },
    {
      title: "ACTIVE",
      value: data.active,
      icon: UserCheck,
      gradient: "from-[#11998e] to-[#38ef7d]", // Vibrant green
    },
    {
      title: "SUSPENDED",
      value: data.suspended,
      icon: UserX,
      gradient: "from-[#f09819] to-[#edde5d]", // Vibrant orange
    },
    {
      title: "DEACTIVATED",
      value: data.deactivated,
      icon: UserMinus,
      gradient: "from-[#FF416C] to-[#FF4B2B]", // Vibrant red
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {summaries.map((summary, index) => (
        <motion.div
          key={index}
          variants={item}
          whileHover={{ scale: 1.02, translateY: -5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card
            className={`overflow-hidden border-none ring-0 shadow-xl rounded-3xl p-0 bg-gradient-to-br ${summary.gradient} relative h-32`}
          >
            <div className="absolute inset-0 bg-black/5" />

            <CardContent className="p-6 text-white relative z-10 h-full w-full">
              <div className="flex flex-col h-full">
                <p className="text-4xl font-black mb-1">{summary.value}</p>
                <p className="text-[10px] font-bold tracking-widest opacity-80 uppercase mt-auto">
                  {summary.title}
                </p>
              </div>

              <div className="absolute top-6 right-6 opacity-30">
                <summary.icon className="size-8 stroke-[2]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
