"use client";

import { useState } from "react";
import { ChevronRight, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bracketRounds } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function BracketBoard() {
  const [champion, setChampion] = useState("Canada");

  function pickChampion(team: string) {
    setChampion(team);
    toast.success(`${team} selected as champion`, {
      description: "Bracket selection is staged for the production save flow.",
    });
  }

  return (
    <div className="scrollbar-soft overflow-x-auto pb-3">
      <div className="grid min-w-[980px] grid-cols-5 gap-3">
        {bracketRounds.map((round, roundIndex) => (
          <section key={round.name} className="app-panel rounded-lg p-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{round.name}</p>
              {roundIndex < bracketRounds.length - 1 ? <ChevronRight className="size-4 text-muted-foreground" /> : <Crown className="size-4 text-primary" />}
            </div>
            <div className={cn("space-y-3", roundIndex > 1 && "pt-10", roundIndex > 2 && "pt-24")}>
              {round.matches.map((match) => (
                <article key={match.join("-")} className="rounded-lg border border-border bg-background/55 p-3">
                  {match.map((team) => (
                    <button
                      type="button"
                      key={team}
                      onClick={() => pickChampion(team)}
                      className={cn(
                        "mb-2 flex w-full min-h-10 items-center justify-between rounded-md px-3 text-left text-sm transition last:mb-0 hover:bg-secondary",
                        champion === team && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      <span className="truncate">{team}</span>
                      {champion === team ? <Crown className="size-4" /> : null}
                    </button>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Button className="mt-4 w-full sm:w-auto" onClick={() => toast.success("Bracket saved on this device")}>
        Save bracket path
      </Button>
    </div>
  );
}
