"use client";

import { Flame, Handshake, MessageCircle, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const emotes = [
  { label: "Nice pick", icon: Handshake },
  { label: "Close one", icon: Swords },
  { label: "Hot streak", icon: Flame },
  { label: "Comment", icon: MessageCircle },
];

export function RivalCard({ name, delta, league }: { name: string; delta: number; league: string }) {
  return (
    <Card className="app-panel border-border bg-transparent">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{league}</p>
          </div>
          <span className="rounded-md border border-border px-2.5 py-1 text-sm">{delta > 0 ? `+${delta}` : delta} pts</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {emotes.map((emote) => (
            <Button
              key={emote.label}
              variant="secondary"
              className="justify-start bg-secondary/60"
              onClick={() => toast.success(`${emote.label} sent to ${name}`)}
            >
              <emote.icon className="size-4" />
              {emote.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MiniLeagueActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button onClick={() => toast.success("Create league flow ready")}>
        <Plus className="size-4" />
        Create mini-league
      </Button>
      <Button variant="secondary" onClick={() => toast.success("Join league flow ready")}>
        Join with code
      </Button>
    </div>
  );
}
