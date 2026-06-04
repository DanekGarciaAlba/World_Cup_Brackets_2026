"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeamSummary } from "@/lib/data/worldCupData";
import { QualificationGlow } from "./QualificationGlow";

type SortableTeamRowProps = {
  team: TeamSummary;
  rank: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function SortableTeamRow({ team, rank, onMoveUp, onMoveDown }: SortableTeamRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 ${isDragging ? "ring-2 ring-electric" : ""}`}
    >
      <button
        type="button"
        className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary"
        aria-label={`Move ${team.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="grid size-9 place-items-center rounded-xl bg-secondary text-sm font-semibold">{rank}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{team.name}</p>
        <p className="text-xs text-muted-foreground">{team.country ?? team.code ?? "Team"}</p>
      </div>
      <QualificationGlow rank={rank} />
      <div className="hidden gap-1 sm:flex">
        <Button type="button" size="icon" variant="ghost" onClick={onMoveUp} aria-label={`Move ${team.name} up`}>
          <ArrowUp className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={onMoveDown} aria-label={`Move ${team.name} down`}>
          <ArrowDown className="size-4" />
        </Button>
      </div>
    </div>
  );
}
