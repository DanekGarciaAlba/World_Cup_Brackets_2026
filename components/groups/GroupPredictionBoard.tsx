"use client";

import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/demo-data";

type GroupPredictionBoardProps = {
  group: string;
  teams: Team[];
};

export function GroupPredictionBoard({ group, teams }: GroupPredictionBoardProps) {
  const [ordered, setOrdered] = useState(teams);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrdered((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function saveGroup() {
    window.localStorage.setItem(`wcb26:group:${group}`, JSON.stringify(ordered.map((team) => team.id)));
    toast.success(`Group ${group} ranking saved`, {
      description: "Your predicted finish order is ready for server-side persistence.",
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <article className="app-panel rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">Group {group}</p>
          <p className="text-sm text-muted-foreground">Drag teams into final order</p>
        </div>
        <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary">top 2 plus best third</span>
      </div>

      {mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ordered.map((team) => team.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ordered.map((team, index) => (
                <SortableTeamRow key={team.id} team={team} rank={index + 1} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {ordered.map((team, index) => (
            <TeamRow key={team.id} team={team} rank={index + 1} />
          ))}
        </div>
      )}

      <Button className="mt-4 w-full" variant="secondary" onClick={saveGroup}>
        <Save className="size-4" />
        Save group order
      </Button>
    </article>
  );
}

function SortableTeamRow({ team, rank }: { team: Team; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border bg-background/55 p-3 ${isDragging ? "opacity-75 ring-2 ring-primary" : ""}`}
    >
      <TeamIdentity team={team} rank={rank} />
      <button
        type="button"
        className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
        aria-label={`Move ${team.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
}

function TeamRow({ team, rank }: { team: Team; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/55 p-3">
      <TeamIdentity team={team} rank={rank} />
      <span className="grid size-10 place-items-center rounded-md text-muted-foreground">
        <GripVertical className="size-4" />
      </span>
    </div>
  );
}

function TeamIdentity({ team, rank }: { team: Team; rank: number }) {
  return (
    <>
      <span className="grid size-8 place-items-center rounded-md bg-secondary text-sm font-semibold">{rank}</span>
      <span className="grid size-9 place-items-center rounded-md text-xs font-semibold" style={{ background: team.color, color: "#04111f" }}>
        {team.code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{team.name}</p>
        <p className="text-xs text-muted-foreground">Projected finish</p>
      </div>
    </>
  );
}
