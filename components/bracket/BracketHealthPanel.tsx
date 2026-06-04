import type { DataQualitySummary } from "@/lib/data/worldCupValidation";
import { BracketHealthCard } from "@/components/dashboard/BracketHealthCard";

export function BracketHealthPanel({ quality }: { quality: DataQualitySummary }) {
  return <BracketHealthCard quality={quality} />;
}
