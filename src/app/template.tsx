"use client";

import React from "react";
import { motion } from "motion/react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.2, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        damping: 26,
        stiffness: 280,
        mass: 0.7,
      }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
