export function QualificationGlow({ rank }: { rank: number }) {
  if (rank <= 2) return <span className="rounded-full bg-pitch-green/15 px-2 py-1 text-xs font-semibold text-pitch-green">Top 2</span>;
  if (rank === 3) return <span className="rounded-full bg-trophy-gold/15 px-2 py-1 text-xs font-semibold text-trophy-gold">Third-place race</span>;
  return <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-muted-foreground">Needs help</span>;
}
