"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaderboardEntry } from "@/lib/demo-data";

const columnHelper = createColumnHelper<LeaderboardEntry>();

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const [mounted, setMounted] = useState(false);
  const columns = useMemo(
    () => [
      columnHelper.accessor("rank", { header: "Rank", cell: (info) => `#${info.getValue()}` }),
      columnHelper.accessor("name", { header: "Player" }),
      columnHelper.accessor("team", { header: "Office team" }),
      columnHelper.accessor("points", { header: "Points" }),
      columnHelper.accessor("exacts", { header: "Exacts" }),
      columnHelper.accessor("bracket", { header: "Bracket" }),
      columnHelper.accessor("streak", { header: "Streak" }),
    ],
    [],
  );
  const table = useReactTable({ data: entries, columns, getCoreRowModel: getCoreRowModel() });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="app-panel hidden overflow-hidden rounded-lg md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <article key={entry.name} className="app-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">#{entry.rank} {entry.name}</p>
                <p className="text-sm text-muted-foreground">{entry.team}</p>
              </div>
              <p className="text-2xl font-semibold">{entry.points}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="app-panel rounded-lg p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold">Points by player</p>
          <p className="text-xs text-muted-foreground">Top six standings preview</p>
        </div>
        <div className="h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entries} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(173,211,255,.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9fb2c8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#9fb2c8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={{ fill: "rgba(255,255,255,.05)" }} contentStyle={{ background: "#081728", border: "1px solid rgba(173,211,255,.16)", borderRadius: 8 }} />
                <Bar dataKey="points" fill="#35e0a1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-border bg-background/45" />
          )}
        </div>
      </div>
    </section>
  );
}
