import { PremiumBracket } from "@/components/bracket/PremiumBracket";
import { PageHeader } from "@/components/layout/PageHeader";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const data = await getWorldCupDashboardData();
  const knockoutMatches = data.matches.filter((match) => {
    const text = `${match.round ?? ""} ${match.stage ?? ""}`.toLowerCase();
    return /round of 32|round of 16|quarter|semi|final|knockout/.test(text);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Knockout Path"
        title="Projected until official."
        description="Before official knockout fixtures exist, the bracket stays clearly labeled as projected or pending. No hardcoded teams."
        badge={knockoutMatches.length > 0 ? "Official fixtures" : "Pending"}
      />
      <PremiumBracket matches={knockoutMatches} quality={data.quality} />
    </div>
  );
}
