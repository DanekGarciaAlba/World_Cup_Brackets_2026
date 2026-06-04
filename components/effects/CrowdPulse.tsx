"use client";

import { motion } from "motion/react";

export function CrowdPulse() {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <motion.span
          key={index}
          className="block w-1 rounded-full bg-primary/60"
          initial={{ height: 6 }}
          animate={{ height: [6, 18 + (index % 5) * 4, 8] }}
          transition={{ repeat: Infinity, duration: 1.8, delay: index * 0.04 }}
        />
      ))}
    </div>
  );
}
