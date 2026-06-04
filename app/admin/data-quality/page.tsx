import { DataQualityPanel } from "@/components/admin/DataQualityPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { getWorldCupDataQuality } from "@/lib/data/worldCupValidation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDataQualityPage() {
  const dataQuality = await getWorldCupDataQuality(createAdminClient());

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="World Cup data quality"
        description="Validate synced teams, fixtures, groups, standings, and bracket readiness without exposing secrets."
        badge={dataQuality.lastValidationStatus}
      />
      <DataQualityPanel initial={dataQuality} />
    </div>
  );
}
