import { BracketBoard } from "@/components/bracket/BracketBoard";
import { PageHeader } from "@/components/layout/PageHeader";

export default function BracketPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Knockout Path"
        title="Build the road to the final."
        description="Project each round before the bracket goes live. Slots can be replaced by confirmed API-Football fixtures once qualification is known."
        badge="Projected bracket"
      />
      <BracketBoard />
    </div>
  );
}
