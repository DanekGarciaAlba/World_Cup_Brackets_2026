import { PremiumDashboard } from "@/components/dashboard/PremiumDashboard";
import { getWorldCupDashboardData } from "@/lib/data/worldCupData";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getWorldCupDashboardData();

  return <PremiumDashboard data={data} />;
}
