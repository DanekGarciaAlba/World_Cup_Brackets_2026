import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function PremiumCard({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return <section className={cn("premium-card", className)} {...props} />;
}
