import { Badge } from "@/components/ui/badge";
import type { DataQualitySummary } from "@/lib/data/worldCupValidation";
import type { MatchSummary } from "@/lib/data/worldCupData";
import { BracketConnector } from "./BracketConnector";
import { BracketHealthPanel } from "./BracketHealthPanel";
import { BracketRound } from "./BracketRound";
import { ChampionPickCard } from "./ChampionPickCard";

const roundLabels = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];

export function PremiumBracket({ matches, quality }: { matches: MatchSummary[]; quality: DataQualitySummary }) {
  const rounds = roundLabels.map((label) => ({
    label,
    matches: matches.filter((match) => {
      const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
      return text.includes(label.toLowerCase()) || (label === "Quarter-finals" && text.includes("quarter"));
    }),
  }));
  const official = matches.length > 0;

  return (
    <div className="grid gap-5">
      <section className="premium-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">Knockout bracket</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {official
                ? "Official knockout fixtures detected from synced data."
                : "Bracket unlocks after group data and official knockout fixtures are synced."}
            </p>
          </div>
          <Badge variant={official ? "default" : "secondary"}>{official ? "Official" : "Projected / pending"}</Badge>
        </div>
      </section>
      {official ? (
        <div className="scrollbar-soft overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {rounds.map((round, index) => (
              <div className="flex items-center gap-3" key={round.label}>
                <BracketRound title={round.label} matches={round.matches} />
                {index < rounds.length - 1 ? <BracketConnector /> : null}
              </div>
            ))}
            <ChampionPickCard />
          </div>
        </div>
      ) : (
        <section className="premium-card grid min-h-[320px] place-items-center p-8 text-center">
          <div>
            <p className="text-2xl font-semibold">Bracket not official yet</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The app will not hardcode knockout teams. Once API-Football provides official knockout fixtures, this page will render them and label the bracket official.
            </p>
          </div>
        </section>
      )}
      <BracketHealthPanel quality={quality} />
    </div>
  );
}
