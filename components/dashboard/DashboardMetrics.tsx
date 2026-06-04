"use client";

import CountUp from "react-countup";
import { motion } from "motion/react";
import { Activity, CircleCheck, Goal, Trophy } from "lucide-react";

const metrics = [
  { label: "Open fixtures", value: 64, suffix: "", icon: Goal, color: "text-primary" },
  { label: "Leaderboard rows", value: 48, suffix: "", icon: Trophy, color: "text-accent" },
  { label: "Exact-score bonus", value: 5, suffix: " pts", icon: CircleCheck, color: "text-chart-3" },
  { label: "Live checks", value: 3, suffix: " min", icon: Activity, color: "text-chart-4" },
];

export function DashboardMetrics() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <motion.article
          key={metric.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="app-panel rounded-lg p-4"
        >
          <div className="mb-5 flex items-center justify-between">
            <metric.icon className={`size-5 ${metric.color}`} />
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">2026</span>
          </div>
          <p className="text-3xl font-semibold">
            <CountUp end={metric.value} duration={1.1} enableScrollSpy />
            {metric.suffix}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
        </motion.article>
      ))}
    </div>
  );
}
