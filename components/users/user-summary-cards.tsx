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
      className: "border-[#D8E2F8] bg-white text-[#1E3A8A]",
    },
    {
      title: "ACTIVE",
      value: data.active,
      icon: UserCheck,
      className: "border-[#1E3A8A] bg-[#1E3A8A] text-white",
    },
    {
      title: "SUSPENDED",
      value: data.suspended,
      icon: UserX,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    {
      title: "DEACTIVATED",
      value: data.deactivated,
      icon: UserMinus,
      className: "border-red-200 bg-red-50 text-red-700",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {summaries.map((summary, index) => (
        <motion.div
          key={index}
          variants={item}
          whileHover={{ scale: 1.01, translateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card
            className={`relative h-28 overflow-hidden rounded-xl border p-0 shadow-sm ${summary.className}`}
          >
            <CardContent className="relative z-10 h-full w-full p-5">
              <div className="flex flex-col h-full">
                <p className="mb-1 text-3xl font-black">{summary.value}</p>
                <p className="mt-auto text-xs font-bold uppercase tracking-wide opacity-80">
                  {summary.title}
                </p>
              </div>

              <div className="absolute right-5 top-5 opacity-30">
                <summary.icon className="size-7 stroke-[2]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
