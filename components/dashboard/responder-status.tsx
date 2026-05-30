"use client"

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Responder } from "@/types/dashboard";
import { motion, useMotionValue, animate } from "motion/react";

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
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 }
};

export function ResponderStatus({ responders = [] }: { responders?: Responder[] }) {
  const [constraints, setConstraints] = React.useState({ left: 0, right: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  React.useEffect(() => {
    const updateConstraints = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidth = contentRef.current.scrollWidth;
        const scrollableWidth = contentWidth - containerWidth;
        
        const newLeft = scrollableWidth > 0 ? -scrollableWidth : 0;
        setConstraints({
          left: newLeft,
          right: 0
        });

        // Ensure current x is within new constraints
        const currentX = x.get();
        if (currentX < newLeft) {
          animate(x, newLeft, { type: "spring", bounce: 0 });
        } else if (currentX > 0) {
          animate(x, 0, { type: "spring", bounce: 0 });
        }
      }
    };

    // Initial check and setup resize listener
    const timer = setTimeout(updateConstraints, 100); // Small delay to ensure layout is ready
    window.addEventListener("resize", updateConstraints);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateConstraints);
    };
  }, [responders, x]);

  const canDrag = constraints.left < 0;

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
    <Card className="border-none shadow-md rounded-2xl h-full overflow-hidden flex flex-col">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-xl font-bold text-[#1E293B]">Responders</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-4">
        <div 
          ref={containerRef}
          className={`w-full h-full overflow-hidden flex items-center ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        >
          <motion.div 
            ref={contentRef}
            drag={canDrag ? "x" : false}
            dragConstraints={constraints}
            dragElastic={0.1}
            dragTransition={{ power: 0.2, timeConstant: 200 }}
            style={{ x }}
            variants={container}
            initial="hidden"
            animate="show"
            className="flex w-max space-x-4 p-1 h-full"
          >
            {responders.length > 0 ? (
              responders.map((responder) => (
                <motion.div
                  key={responder.id}
                  variants={item}
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  className="flex flex-col items-center justify-center p-4 rounded-3xl border border-[#F1F5F9] w-[160px] md:w-[180px] shrink-0 bg-white shadow-sm select-none h-full"
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
              <div className="flex items-center justify-center w-full py-8 text-[#64748B] font-medium text-sm">
                No active responders
              </div>
            )}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
