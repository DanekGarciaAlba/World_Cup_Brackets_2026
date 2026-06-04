export function GroupPredictionSummary() {
  return (
    <section className="premium-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Prediction status</p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Group predictions are staged only after official synced group data exists. Missing teams are never filled with random countries.
      </p>
    </section>
  );
}
