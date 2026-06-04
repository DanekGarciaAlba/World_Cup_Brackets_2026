import { PageHeader } from "@/components/layout/PageHeader";
import { MatchPredictionCard } from "@/components/picks/MatchPredictionCard";
import { Badge } from "@/components/ui/badge";
import { fixtures } from "@/lib/demo-data";

export default function PicksPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Fixture Picks"
        title="Call the scores before kickoff."
        description="Stage match score predictions, confidence levels, and points-only boosts. Each match card is built for thumb-first mobile use."
        badge="Server kickoff locks"
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {fixtures.map((fixture) => (
          <MatchPredictionCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}
