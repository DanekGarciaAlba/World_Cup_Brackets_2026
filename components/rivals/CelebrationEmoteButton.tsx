"use client";

import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CelebrationEmoteButton({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <Button variant="secondary" onClick={() => toast.success(`${label} emote queued`)}>
      <Icon className="size-4" />
      {label}
    </Button>
  );
}
