"use client";

import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GroupSummary, TeamSummary } from "@/lib/data/worldCupData";
import { SortableTeamRow } from "./SortableTeamRow";

export function PremiumGroupCard({ group }: { group: GroupSummary }) {
  const [ordered, setOrdered] = useState<TeamSummary[]>(group.teams);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => setMounted(true), []);

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;
    setOrdered((items) => arrayMove(items, index, nextIndex));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrdered((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function save() {
    window.localStorage.setItem(`wcb26:group:${group.groupName}`, JSON.stringify(ordered.map((team) => team.id)));
    toast.success(`Group ${group.groupName} prediction staged`);
  }

  return (
    <section className="premium-card p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold">Group {group.groupName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{group.teams.length} synced teams</p>
        </div>
        {group.teams.length !== 4 ? (
          <span className="rounded-full bg-trophy-gold/15 px-3 py-1 text-xs font-semibold text-trophy-gold">Review</span>
        ) : (
          <span className="rounded-full bg-pitch-green/15 px-3 py-1 text-xs font-semibold text-pitch-green">Ready</span>
        )}
      </div>
      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ordered.map((team) => team.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ordered.map((team, index) => (
                <SortableTeamRow
                  key={team.id}
                  team={team}
                  rank={index + 1}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {ordered.map((team, index) => (
            <div key={team.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm">
              {index + 1}. {team.name}
            </div>
          ))}
        </div>
      )}
      <Button className="mt-5 w-full" disabled={group.teams.length !== 4} onClick={save}>
        <Save className="size-4" />
        Save group order
      </Button>
    </section>
  );
}
