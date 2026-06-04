export function PickReveal({ locked }: { locked: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
      {locked ? "Picks can be revealed after lock." : "Opponent picks stay hidden until kickoff lock."}
    </div>
  );
}
