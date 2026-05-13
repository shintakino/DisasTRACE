"use client"

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Responder } from "@/types/dashboard";
import { motion } from "motion/react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export function PACCResponderGrid({ responders = [] }: { responders?: Responder[] }) {
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DISPATCHED':
        return "bg-[#D8DEF1] text-[#15286A] border-[#B8C2E5]";
      case 'STANDBY':
        return "bg-[#FAF1BC] text-[#8C7700] border-[#EBD982]";
      case 'OFF DUTY':
        return "bg-[#E1A6A8] text-[#A80107] border-[#D28C8E]";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]";
    }
  };

  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="bg-[#1E3A8A] p-4">
        <CardTitle className="text-xl font-bold text-white">Responders</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
        >
          {responders.length > 0 ? (
            responders.map((responder) => (
              <motion.div
                key={responder.id}
                variants={item}
                whileHover={{ scale: 1.02, translateY: -2 }}
                className="flex flex-col items-center justify-center p-4 rounded-3xl border border-[#F1F5F9] bg-white shadow-sm select-none"
              >
                <Avatar className="size-16 mb-4 ring-4 ring-[#F1F5F9] ring-offset-2 pointer-events-none">
                  <AvatarFallback className="bg-[#15286A] text-white text-2xl font-bold">
                    {responder.initials}
                  </AvatarFallback>
                </Avatar>
                
                <span className="text-sm font-bold text-[#1E293B] text-center mb-3 truncate w-full pointer-events-none">
                  {responder.name}
                </span>
                
                <div className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest pointer-events-none border ${getStatusStyle(responder.status)}`}>
                  {responder.status}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center py-12 text-[#64748B] font-medium text-sm">
              No active responders
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}
